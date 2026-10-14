import { mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMessages } from '../lib/messages.mjs';
import { buildResolveOptions } from './options.mjs';
import { runQuery } from '../lib/run.mjs';
import { selectBackend } from '../lib/backend.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const messagesPath = path.join(repoRoot, 'docs', 'customer-messages.md');
const outputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    write_status: { type: 'string', enum: ['completed', 'denied', 'not-needed', 'escalated'] },
    transaction_id: { type: ['string', 'null'] },
    fraud_risk: { type: 'string', enum: ['low', 'medium', 'high'] },
    fraud_signals: { type: 'array', items: { type: 'string' } },
    hold: { type: 'boolean' },
    summary: { type: 'string' },
    customer_reply: { type: 'string' },
  },
  required: ['write_status', 'transaction_id', 'fraud_risk', 'fraud_signals', 'hold', 'summary', 'customer_reply'],
};

function parseArgs(args) {
  let backendArgument;
  let dryRun = false;
  let id;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--backend') {
      backendArgument = args[index + 1];
      if (!backendArgument) throw new Error('Set --backend to claude-code, sdk, or sdk-login.');
      index += 1;
    } else if (arg.startsWith('--backend=')) {
      backendArgument = arg.slice('--backend='.length);
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (!id) {
      id = arg;
    } else {
      throw new Error(`Remove the unexpected argument: ${arg}.`);
    }
  }
  if (!id) throw new Error('Use: npm run resolve -- MSG-0N [--backend sdk|claude-code] [--dry-run]');
  return { id, backendArgument, dryRun };
}

const { id, backendArgument, dryRun } = parseArgs(process.argv.slice(2));
const message = parseMessages(await readFile(messagesPath, 'utf8'))
  .find((item) => item.id === id);
if (!message) throw new Error(`Use a valid message ID. No message exists for ${id}.`);

const backend = selectBackend({ argument: backendArgument });
const prompt = `Resolve one support ticket in this training exercise.

Customer message ${message.id}
Customer: ${message.customer}
Subject: ${message.subject}

${message.message}

Use these steps:
1. Ask customer-context-agent to look up the customer when the ticket has a customer ID.
2. Look up the transaction with get_transaction. Use list_transactions when you need to find a match.
3. Ask fraud-check-agent to check the facts before any write.
4. Use only facts from the ticket and tool results. Do not guess a customer-to-transaction match.
5. Treat only required facts as missing. Do not stop for an optional customer field.
6. Stop with ESCALATE when hold is true or fraud_risk is high. Do not write.
7. Ask one question when fraud_risk is medium or a required fact is missing.
8. Give the person clear options. Continue only after the person selects Continue.
9. Stop with ESCALATE after any other answer.
10. Stop with ESCALATE when AskUserQuestion is not available.
11. Ask transaction-agent to look up the transaction and propose one status update.
12. Let the PreToolUse hook check the write. Stop if it denies the write.
13. Do not retry the write. Do not ask another agent to write.
14. After a successful write, ask customer-reply-agent to save a draft with save_reply_draft.
15. Tell customer-reply-agent to use only facts from the ticket and tool results.
16. Tell customer-reply-agent to state each transaction status exactly as the tool result shows it.
17. Tell customer-reply-agent not to say that the team reviews the case unless a tool result confirms it.
18. Tell customer-reply-agent not to promise future help unless a tool result confirms it.
19. Tell customer-reply-agent not to claim or promise a refund, release, or date.
20. Do not claim success if the write was denied.

Return write_status, transaction_id, fraud_risk, fraud_signals, hold, summary, and customer_reply.`;
const options = buildResolveOptions({ backend });
options.outputFormat = { type: 'json_schema', schema: outputSchema };
const result = await runQuery({
  prompt,
  options,
  dryRun,
  dryRunNote: 'Look up the customer and the transaction. Run fraud-check-agent before a write. Stop with ESCALATE when hold is true or risk is high. Ask one question when risk is medium or a fact is missing. Continue only after the person selects Continue. Stop with ESCALATE after any other answer or a denied write. Propose one update. Let the hook check the write. Save a draft with customer-reply-agent. Use only facts from the ticket and tool results. State each transaction status exactly as the tool result shows it. Do not say that the team reviews the case unless a tool result confirms it. Do not promise future help unless a tool result confirms it. Do not claim or promise a refund, release, or date.',
  backendArgument: backend,
});

if (!dryRun && result.result?.write_status === 'completed' && result.result.customer_reply) {
  console.log('Reply draft saved. Ask a person to review it before sending.');
} else if (!dryRun && result.result?.write_status === 'denied') {
  console.log('The hook denied the write. No reply draft was saved.');
} else if (!dryRun && result.result?.write_status === 'escalated') {
  console.log('ESCALATE. Do not write the transaction.');
}
