import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// The workbook lives in docs/ (outside every claude-project). Only server.js reads it.
export const defaultWorkbookPath = path.join(repoRoot, 'docs', 'transactions.xlsx');
// Record changes (stretch: transaction-clerk) go to a resettable working copy, never to the workbook.
export const defaultStorePath = path.join(repoRoot, 'participant-output', 'transactions.working.json');
