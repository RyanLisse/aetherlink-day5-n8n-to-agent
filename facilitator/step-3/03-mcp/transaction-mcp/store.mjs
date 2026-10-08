import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

export async function loadTransactions({ storePath, readSeed }) {
  if (existsSync(storePath)) {
    return JSON.parse(readFileSync(storePath, 'utf8'));
  }

  return readSeed();
}

export function saveTransactions(storePath, transactions) {
  const temporaryPath = `${storePath}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(transactions, null, 2)}\n`);
  renameSync(temporaryPath, storePath);
}
