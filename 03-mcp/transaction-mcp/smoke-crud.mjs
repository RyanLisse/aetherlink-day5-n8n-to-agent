import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { defaultStorePath, defaultWorkbookPath } from './paths.mjs';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const directory = mkdtempSync(path.join(os.tmpdir(), 'transaction-crud-smoke-'));
const storePath = path.join(directory, 'missing', 'nested', 'transactions.json');
const resetPath = path.join(serverDirectory, 'reset.mjs');
const workbookHash = () => createHash('sha256').update(readFileSync(defaultWorkbookPath)).digest('hex');
const hashIfPresent = (target) => (existsSync(target)
  ? createHash('sha256').update(readFileSync(target)).digest('hex')
  : null);
const hashBefore = workbookHash();
const defaultStoreHashBefore = hashIfPresent(defaultStorePath);
const client = new Client({ name: 'transaction-crud-smoke', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(serverDirectory, 'server.js')],
  env: {
    ...process.env,
    TRANSACTIONS_XLSX: defaultWorkbookPath,
    TRANSACTIONS_STORE: storePath,
    TRANSACTIONS_WRITES_ENABLED: '1',
  },
});
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};
const call = async (name, args) => {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content.map((block) => block.text ?? '').join('\n');
  return { result, text, value: result.isError ? null : JSON.parse(text) };
};

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const names = tools.map(({ name }) => name).sort();
  expect(
    names.join() === 'add_transaction,delete_transaction,get_transaction,list_transactions,update_transaction',
    `Unexpected transaction tools: ${names.join(', ')}`,
  );
  for (const tool of tools) {
    const readOnly = ['get_transaction', 'list_transactions'].includes(tool.name);
    expect(tool.annotations?.readOnlyHint === readOnly, `${tool.name} has the wrong read-only annotation.`);
  }
  const initial = await call('get_transaction', { transaction_id: 'TX-1003' });
  expect(!initial.result.isError, initial.text);
  const update = await call('update_transaction', { transaction_id: 'TX-1003', status: 'COMPLETED' });
  expect(!update.result.isError && update.value.after.status === 'COMPLETED', update.text);
  const added = await call('add_transaction', {
    customer: 'Smoke Example BV',
    amount: 25,
    status: 'PENDING',
    date: '2026-10-14',
    currency: 'EUR',
    issue_details: 'Temporary smoke-test transaction',
  });
  expect(!added.result.isError && added.value.transactionId, added.text);
  const deleted = await call('delete_transaction', { transaction_id: added.value.transactionId });
  expect(!deleted.result.isError && deleted.value.transactionId === added.value.transactionId, deleted.text);
  expect(existsSync(storePath), 'The store should be created under its missing parent directories.');
  expect(workbookHash() === hashBefore, 'transactions.xlsx changed during CRUD.');

  const reset = spawnSync(process.execPath, [resetPath], {
    encoding: 'utf8',
    env: { ...process.env, TRANSACTIONS_STORE: storePath },
  });
  expect(reset.status === 0 && !existsSync(storePath), reset.stderr || 'reset did not remove the working copy.');
  expect(workbookHash() === hashBefore, 'transactions.xlsx changed during reset.');
  expect(hashIfPresent(defaultStorePath) === defaultStoreHashBefore, 'The default working copy changed during smoke tests.');
  console.log('MCP CRUD smoke passed. The test updated, added and deleted a record.');
  console.log('It reset the working copy. The workbook stayed unchanged.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
  rmSync(directory, { recursive: true, force: true });
}
