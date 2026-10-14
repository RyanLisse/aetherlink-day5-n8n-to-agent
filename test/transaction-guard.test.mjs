import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  appendAuditLine, askPerson, createSdkHooks, DENIAL_REASON, evaluatePreToolUse, runClaudeCodeHook,
} from '../03-mcp/hooks/transaction-guard.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hookPath = path.join(root, '03-mcp', 'hooks', 'transaction-guard.mjs');
const lookupTransaction = async (id) => ({
  'TX-1003': { transactionId: 'TX-1003', amount: 780, status: 'PENDING' },
  'TX-1004': { transactionId: 'TX-1004', amount: 19.95, status: 'COMPLETED' },
})[id] ?? null;

test('reads pass, small updates auto-allow, and sensitive writes ask', async () => {
  assert.equal((await evaluatePreToolUse({ tool_name: 'mcp__transactions__get_transaction' })).action, 'allow');
  assert.equal((await evaluatePreToolUse({
    tool_name: 'mcp__drafts__save_reply_draft',
  })).action, 'allow');
  assert.equal((await evaluatePreToolUse({
    tool_name: 'mcp__transactions__update_transaction',
    tool_input: { transaction_id: 'TX-1004', status: 'COMPLETED' },
  }, { lookupTransaction })).action, 'allow');
  assert.equal((await evaluatePreToolUse({
    tool_name: 'mcp__transactions__update_transaction',
    tool_input: { transaction_id: 'TX-1004', amount: 500, status: 'COMPLETED' },
  }, { lookupTransaction })).action, 'ask');
  for (const tool_name of [
    'mcp__transactions__add_transaction',
    'mcp__transactions__delete_transaction',
    'mcp__transactions__update_transaction',
  ]) {
    const tool_input = tool_name.endsWith('update_transaction')
      ? { transaction_id: 'TX-1003', status: 'COMPLETED' }
      : { transaction_id: 'TX-1003', customer: 'Example BV', amount: 100 };
    assert.equal((await evaluatePreToolUse({ tool_name, tool_input }, { lookupTransaction })).action, 'ask');
  }
});

test('unknown IDs and invalid statuses deny before a write', async () => {
  const unknown = await evaluatePreToolUse({
    tool_name: 'mcp__transactions__update_transaction',
    tool_input: { transaction_id: 'TX-9999', status: 'COMPLETED' },
  }, { lookupTransaction });
  assert.equal(unknown.action, 'deny');
  const badStatus = await evaluatePreToolUse({
    tool_name: 'mcp__transactions__add_transaction',
    tool_input: { status: 'UNKNOWN' },
  }, { lookupTransaction });
  assert.equal(badStatus.action, 'deny');
});

test('large update denies without a TTY and includes the no-retry reason', async (context) => {
  const pre = createSdkHooks({
    lookupTransaction,
    prompt: (input, transaction) => askPerson(input, transaction, {
      inputStream: { isTTY: false },
      outputStream: { isTTY: false },
    }),
  }).PreToolUse[0].hooks[0];
  const result = await pre({
    tool_name: 'mcp__transactions__update_transaction',
    tool_input: { transaction_id: 'TX-1003', status: 'COMPLETED' },
  });
  assert.equal(result.hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(result.hookSpecificOutput.permissionDecisionReason, DENIAL_REASON);
});

test('approved write proceeds and a successful write creates one audit line', async () => {
  let prompted = false;
  const hooks = createSdkHooks({
    lookupTransaction,
    prompt: async () => { prompted = true; return true; },
  });
  const input = {
    tool_name: 'mcp__transactions__update_transaction',
    tool_input: { transaction_id: 'TX-1003', status: 'COMPLETED' },
  };
  const allow = await hooks.PreToolUse[0].hooks[0](input);
  assert.equal(allow.hookSpecificOutput.permissionDecision, 'allow');
  assert.equal(prompted, true);

  const directory = mkdtempSync(path.join(os.tmpdir(), 'transaction-audit-'));
  const auditPath = path.join(directory, 'audit.jsonl');
  try {
    appendAuditLine({ ...input, tool_response: { content: [{ text: 'updated TX-1003' }] } }, { auditPath });
    const records = readFileSync(auditPath, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(records.length, 1);
    assert.equal(records[0].tool, input.tool_name);
    assert.deepEqual(records[0].input, input.tool_input);
    assert.equal(records[0].result, 'updated TX-1003');
    assert.ok(records[0].time);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('approved writes and draft saves return an explicit allow decision', async () => {
  const hooks = createSdkHooks({
    lookupTransaction,
    prompt: async () => true,
  });
  const preToolUse = hooks.PreToolUse[0].hooks[0];
  const approvedWrite = await preToolUse({
    tool_name: 'mcp__transactions__update_transaction',
    tool_input: { transaction_id: 'TX-1003', status: 'COMPLETED' },
  });
  const autoAllowedWrite = await preToolUse({
    tool_name: 'mcp__transactions__update_transaction',
    tool_input: { transaction_id: 'TX-1004', status: 'COMPLETED' },
  });
  const draftSave = await preToolUse({
    tool_name: 'mcp__drafts__save_reply_draft',
    tool_input: { message_id: 'MSG-07' },
  });

  assert.equal(approvedWrite.hookSpecificOutput.permissionDecision, 'allow');
  assert.equal(autoAllowedWrite.hookSpecificOutput.permissionDecision, 'allow');
  assert.equal(draftSave.hookSpecificOutput.permissionDecision, 'allow');
});

test('drafts pass without a prompt and PostToolUse audits them', async () => {
  let prompted = false;
  const directory = mkdtempSync(path.join(os.tmpdir(), 'draft-audit-'));
  const auditPath = path.join(directory, 'audit.jsonl');
  const hooks = createSdkHooks({
    prompt: async () => { prompted = true; return false; },
    auditPath,
  });
  const input = {
    tool_name: 'mcp__drafts__save_reply_draft',
    tool_input: { message_id: 'MSG-03', subject: 'Update', body: 'The draft is ready.' },
  };
  try {
    const allow = await hooks.PreToolUse[0].hooks[0](input);
    assert.equal(allow.hookSpecificOutput.permissionDecision, 'allow');
    assert.equal(prompted, false);
    await hooks.PostToolUse[0].hooks[0]({
      ...input,
      tool_response: { content: [{ text: 'Draft saved.' }] },
    });
    const [record] = readFileSync(auditPath, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(record.tool, input.tool_name);
    assert.deepEqual(record.input, input.tool_input);
    assert.equal(record.result, 'Draft saved.');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Claude Code hook consumes stdin and returns ask for a human-gated write', async () => {
  const result = await runClaudeCodeHook('pre', {
    tool_name: 'mcp__transactions__update_transaction',
    tool_input: { transaction_id: 'TX-1003', status: 'COMPLETED' },
  });
  assert.deepEqual(result.hookSpecificOutput, {
    hookEventName: 'PreToolUse',
    permissionDecision: 'ask',
    permissionDecisionReason: 'A person must approve update_transaction for TX-1003. Amount: 780 EUR. Limit: 100 EUR.',
  });
  const directory = mkdtempSync(path.join(os.tmpdir(), 'transaction-hook-'));
  try {
    const child = spawnSync(process.execPath, [hookPath, 'pre'], {
      cwd: path.join(root, '03-mcp', 'claude-project'),
      env: { ...process.env, TRANSACTIONS_STORE: path.join(directory, 'working.json') },
      input: JSON.stringify({
        tool_name: 'mcp__transactions__update_transaction',
        tool_input: { transaction_id: 'TX-1003', status: 'COMPLETED' },
      }),
      encoding: 'utf8',
    });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(JSON.parse(child.stdout).hookSpecificOutput.permissionDecision, 'ask');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
