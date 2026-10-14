import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { addTransaction, deleteTransaction, updateTransaction } from '../03-mcp/transaction-mcp/transactions.mjs';
import { loadTransactions, saveTransactions } from '../03-mcp/transaction-mcp/store.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workbookPath = path.join(root, 'docs', 'transactions.xlsx');
const resetPath = path.join(root, '03-mcp', 'transaction-mcp', 'reset.mjs');
const hashFile = (filePath) => createHash('sha256').update(readFileSync(filePath)).digest('hex');

test('CRUD writes to a fresh nested store and reset removes only the working copy', async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'transaction-store-'));
  const storePath = path.join(directory, 'missing', 'nested', 'transactions.json');
  const draftsDirectory = path.join(directory, 'drafts');
  const workbookHash = hashFile(workbookPath);
  const seed = [{
    transactionId: 'TX-1001',
    customer: 'Example BV',
    amount: 25,
    status: 'PENDING',
    date: '2026-01-01',
    currency: 'EUR',
    issueDetails: 'Example',
    fraudFlag: 'No',
  }];
  try {
    const initial = await loadTransactions({ storePath, readSeed: async () => seed });
    const added = addTransaction(initial, {
      customer: 'Second BV', amount: 50, status: 'PENDING', date: '2026-01-02',
      currency: 'EUR', issueDetails: 'New', fraudFlag: 'No',
    });
    const updated = updateTransaction(added.transactions, 'TX-1001', { status: 'COMPLETED' });
    assert.ok(updated);
    saveTransactions(storePath, updated.transactions);
    const reloaded = await loadTransactions({ storePath, readSeed: async () => seed });
    assert.equal(reloaded.find((transaction) => transaction.transactionId === 'TX-1001').status, 'COMPLETED');
    assert.equal(reloaded.find((transaction) => transaction.transactionId === 'TX-1002').customer, 'Second BV');

    const deleted = deleteTransaction(reloaded, 'TX-1002');
    assert.ok(deleted);
    saveTransactions(storePath, deleted.transactions);
    mkdirSync(draftsDirectory);
    writeFileSync(path.join(draftsDirectory, 'MSG-03.md'), 'Draft');
    const reset = spawnSync(process.execPath, [resetPath], {
      encoding: 'utf8',
      env: { ...process.env, TRANSACTIONS_STORE: storePath, DRAFTS_DIR: draftsDirectory },
    });
    assert.equal(reset.status, 0, reset.stderr);
    assert.equal(existsSync(storePath), false);
    assert.equal(existsSync(`${storePath}.tmp`), false);
    assert.equal(existsSync(draftsDirectory), false);
    assert.equal(hashFile(workbookPath), workbookHash);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
