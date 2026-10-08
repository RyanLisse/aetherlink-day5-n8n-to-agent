import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { defaultWorkbookPath } from './paths.mjs';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const transactionId = process.argv[2] ?? 'TX-1014';
const scratch = mkdtempSync(path.join(tmpdir(), 'w4-transactions-'));
const workbookHash = () => createHash('sha256').update(readFileSync(defaultWorkbookPath)).digest('hex');
const hashBefore = workbookHash();
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(serverDirectory, 'server.js')],
  env: {
    ...process.env,
    TRANSACTIONS_XLSX: defaultWorkbookPath,
    TRANSACTIONS_STORE: path.join(scratch, 'transactions.working.json'),
  },
});
const client = new Client({ name: 'transaction-smoke', version: '1.1.0' });

const expect = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const call = async (name, args) => {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content.map((block) => block.text ?? '').join('\n');
  return { isError: Boolean(result.isError), text, value: result.isError ? null : JSON.parse(text) };
};

const kind = ({ annotations = {} }) => {
  if (annotations.readOnlyHint) {
    return 'read-only';
  }

  return annotations.destructiveHint ? 'writes (destructive)' : 'writes';
};

await client.connect(transport);

try {
  const { tools } = await client.listTools();
  console.log('Tools:');
  for (const tool of tools) {
    console.log(`  ${tool.name} — ${kind(tool)}`);
  }
  expect(
    tools.map(({ name }) => name).sort().join() === 'add_transaction,delete_transaction,get_transaction,list_transactions,update_transaction',
    'The server must expose list, get, add, update and delete.',
  );

  const lookup = await call('get_transaction', { transaction_id: transactionId });
  expect(!lookup.isError, lookup.text);
  console.log(`get_transaction ${transactionId}:`);
  console.log(JSON.stringify(lookup.value, null, 2));

  const pending = await call('list_transactions', { status: 'PENDING' });
  expect(!pending.isError, pending.text);
  console.log(`list_transactions PENDING: ${pending.value.count}`);

  const added = await call('add_transaction', {
    customer: 'Smoke Test BV', amount: 10, status: 'PENDING', date: '2026-10-01', issue_details: 'Smoke test record',
  });
  expect(!added.isError, added.text);
  const newId = added.value.transactionId;
  console.log(`add_transaction → ${newId}`);

  const updated = await call('update_transaction', { transaction_id: newId, status: 'COMPLETED' });
  expect(!updated.isError && updated.value.after.status === 'COMPLETED', updated.text);
  console.log(`update_transaction ${newId}: ${updated.value.before.status} → ${updated.value.after.status}`);

  const deleted = await call('delete_transaction', { transaction_id: newId });
  expect(!deleted.isError, deleted.text);
  const gone = await call('get_transaction', { transaction_id: newId });
  expect(gone.isError, `${newId} should be gone after delete_transaction.`);
  console.log(`delete_transaction ${newId}: deleted; get_transaction now says "${gone.text}"`);

  expect(workbookHash() === hashBefore, 'transactions.xlsx changed; the workbook must stay read-only.');
  console.log('Working copy used for writes; transactions.xlsx unchanged.');
  console.log('MCP server OK — no model was called.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.close();
  rmSync(scratch, { recursive: true, force: true });
}
