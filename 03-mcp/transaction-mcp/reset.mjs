import { rmSync } from 'node:fs';
import path from 'node:path';
import { defaultDraftsDirectory, defaultStorePath, defaultWorkbookPath } from './paths.mjs';

const storePath = path.resolve(process.env.TRANSACTIONS_STORE ?? defaultStorePath);
const workbookPath = path.resolve(process.env.TRANSACTIONS_XLSX ?? defaultWorkbookPath);
const draftsDirectory = path.resolve(process.env.DRAFTS_DIR ?? defaultDraftsDirectory);
if (storePath === workbookPath) {
  throw new Error('Set TRANSACTIONS_STORE to a JSON path, not transactions.xlsx.');
}
rmSync(storePath, { force: true });
rmSync(`${storePath}.tmp`, { force: true });
rmSync(draftsDirectory, { recursive: true, force: true });
console.log('The working copy and drafts are removed. The workbook stays unchanged.');
