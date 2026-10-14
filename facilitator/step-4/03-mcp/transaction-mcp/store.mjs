// Starter for the assignment. server.js uses it once you add the write tools.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defaultWorkbookPath } from './paths.mjs';

export async function loadTransactions({ storePath, readSeed }) {
  if (existsSync(storePath)) return JSON.parse(readFileSync(storePath, 'utf8'));
  return readSeed();
}

export function saveTransactions(storePath, transactions) {
  const workbookPath = path.resolve(process.env.TRANSACTIONS_XLSX ?? defaultWorkbookPath);
  if (path.resolve(storePath) === workbookPath) {
    throw new Error('Set TRANSACTIONS_STORE to a JSON path, not transactions.xlsx.');
  }
  mkdirSync(path.dirname(storePath), { recursive: true });
  const temporaryPath = `${storePath}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(transactions, null, 2)}\n`);
  renameSync(temporaryPath, storePath);
}
