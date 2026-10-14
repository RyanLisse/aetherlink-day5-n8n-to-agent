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
4. Stop with ESCALATE when hold is true or fraud_risk is high. Do not write.
5. Ask one question when fraud_risk is medium or a fact is missing.
6. Give the person two to four clear options. Continue only after the person selects Continue.
7. Stop with ESCALATE after any other answer.
8. Stop with ESCALATE when AskUserQuestion is not available.
9. Ask transaction-agent to look up the transaction and propose one status update.
10. For MSG-03, use TX-1003 as the training target. Change PENDING to COMPLETED.
11. Do not claim TX-1003 belongs to the customer in MSG-03.
12. Let the PreToolUse hook check the write. Stop if it denies the write.
13. Do not retry the write. Do not ask another agent to write.
14. After a successful write, ask customer-reply-agent to save a draft with save_reply_draft.
15. Do not claim success if the write was denied.

Return write_status, transaction_id, fraud_risk, fraud_signals, hold, summary, and customer_reply.`;
const options = buildResolveOptions({ backend });
options.outputFormat = { type: 'json_schema', schema: outputSchema };
const result = await runQuery({
  prompt,
  options,
  dryRun,
  dryRunNote: 'Look up the customer and the transaction. Run fraud-check-agent before a write. Stop with ESCALATE when hold is true or risk is high. Ask one question when risk is medium or a fact is missing. Continue after approval. Stop with ESCALATE after denial. Propose one update. Let the hook check the write. Save a draft with customer-reply-agent.',
  backendArgument: backend,
});

if (!dryRun && result.result?.write_status === 'completed' && result.result.customer_reply) {
  console.log('Reply draft saved. Ask a person to review it before sending.');
} else if (!dryRun && result.result?.write_status === 'denied') {
  console.log('The hook denied the write. No reply draft was saved.');
} else if (!dryRun && result.result?.write_status === 'escalated') {
  console.log('ESCALATE. Do not write the transaction.');
}
