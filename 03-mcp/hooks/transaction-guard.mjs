import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { defaultAuditPath } from '../transaction-mcp/paths.mjs';
import { getTransactionFromServer } from '../transaction-mcp/client.mjs';
import { STATUSES } from '../transaction-mcp/transactions.mjs';

export const AUTO_APPROVE_TRANSACTION_AMOUNT = 100;
export const DENIAL_REASON = 'Denied by a human reviewer. Do not retry this write or delegate it; report it and stop.';
export const HOOK_TOOL_MATCHER = 'mcp__transactions__(add|update|delete)_transaction|mcp__drafts__save_reply_draft';
const writeTools = new Set([
  'mcp__transactions__add_transaction',
  'mcp__transactions__update_transaction',
  'mcp__transactions__delete_transaction',
]);
const auditedTools = new Set([...writeTools, 'mcp__drafts__save_reply_draft']);
const transactionIdPattern = /^TX-\d{4}$/;

const deny = (reason = DENIAL_REASON) => ({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: reason,
  },
});

function invalid(reason) {
  return { action: 'deny', reason: `${reason} ${DENIAL_REASON}` };
}

export async function evaluatePreToolUse(input, { lookupTransaction = getTransactionFromServer } = {}) {
  const tool = input.tool_name;
  const args = input.tool_input ?? {};
  if (!writeTools.has(tool)) return { action: 'allow' };
  if (args.status !== undefined && !STATUSES.includes(args.status)) return invalid('Use an allowed status.');

  if (tool === 'mcp__transactions__add_transaction') return { action: 'ask' };

  const transactionId = args.transaction_id;
  if (typeof transactionId !== 'string' || !transactionIdPattern.test(transactionId)) {
    return invalid('Use a valid transaction ID.');
  }
  let transaction;
  try {
    transaction = await lookupTransaction(transactionId);
  } catch {
    return invalid(`Check transaction ${transactionId} before you write.`);
  }
  if (!transaction) return invalid(`Check that transaction ${transactionId} exists.`);

  const currentAmount = Number(transaction.amount);
  const requestedAmount = Number(args.amount ?? currentAmount);
  if (
    tool === 'mcp__transactions__update_transaction'
    && currentAmount < AUTO_APPROVE_TRANSACTION_AMOUNT
    && requestedAmount < AUTO_APPROVE_TRANSACTION_AMOUNT
  ) {
    return { action: 'allow', transaction };
  }
  return { action: 'ask', transaction };
}

function summarize(result) {
  const summary = Array.isArray(result?.content)
    ? result.content.map((item) => item.text ?? '').filter(Boolean).join(' ')
    : typeof result === 'string' ? result : JSON.stringify(result ?? null);
  return summary.replace(/\s+/g, ' ').slice(0, 240);
}

export function appendAuditLine(input, { auditPath = process.env.TRANSACTIONS_AUDIT ?? defaultAuditPath } = {}) {
  if (!auditedTools.has(input.tool_name)) return;
  mkdirSync(path.dirname(auditPath), { recursive: true });
  appendFileSync(auditPath, `${JSON.stringify({
    time: new Date().toISOString(),
    tool: input.tool_name,
    input: input.tool_input ?? {},
    result: summarize(input.tool_response),
  })}\n`);
}

export async function askPerson(input, transaction, { inputStream = process.stdin, outputStream = process.stdout } = {}) {
  if (!inputStream.isTTY || !outputStream.isTTY) return false;
  const label = input.tool_name.replace('mcp__transactions__', '');
  const detail = transaction ? `${transaction.transactionId}, amount ${transaction.amount}` : 'new transaction';
  const readline = createInterface({ input: inputStream, output: outputStream });
  try {
    return (await readline.question(`Approve ${label} (${detail})? [y/N] `)).trim().toLowerCase() === 'y';
  } catch {
    return false;
  } finally {
    readline.close();
  }
}

export function createSdkHooks({
  lookupTransaction = getTransactionFromServer,
  prompt = askPerson,
  auditPath,
} = {}) {
  return {
    PreToolUse: [{
      matcher: HOOK_TOOL_MATCHER,
      hooks: [async (input) => {
        const decision = await evaluatePreToolUse(input, { lookupTransaction });
        if (decision.action === 'deny') return deny(decision.reason);
        if (decision.action === 'ask' && !await prompt(input, decision.transaction)) return deny();
        return {};
      }],
    }],
    PostToolUse: [{
      matcher: HOOK_TOOL_MATCHER,
      hooks: [async (input) => {
        appendAuditLine(input, auditPath ? { auditPath } : undefined);
        return {};
      }],
    }],
  };
}

export async function runClaudeCodeHook(eventName, input) {
  if (eventName === 'post') {
    appendAuditLine(input);
    return {};
  }
  const decision = await evaluatePreToolUse(input);
  if (decision.action === 'deny') return deny(decision.reason);
  if (decision.action === 'ask') {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: DENIAL_REASON,
      },
    };
  }
  return {};
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const eventName = process.argv[2];
  try {
    const input = JSON.parse(readFileSync(0, 'utf8'));
    process.stdout.write(`${JSON.stringify(await runClaudeCodeHook(eventName, input))}\n`);
  } catch (error) {
    const output = deny(`Check the hook input. ${DENIAL_REASON}`);
    process.stdout.write(`${JSON.stringify(output)}\n`);
    process.exitCode = 1;
  }
}
