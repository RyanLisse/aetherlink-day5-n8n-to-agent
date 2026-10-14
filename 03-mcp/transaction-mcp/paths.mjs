import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// The workbook lives in docs/ (outside every claude-project). Only server.js reads it.
export const defaultWorkbookPath = path.join(repoRoot, 'docs', 'transactions.xlsx');
export const defaultCustomerContextPath = path.join(repoRoot, 'docs', 'customer_context.csv');
export const defaultStorePath = path.join(repoRoot, 'participant-output', 'transactions.working.json');
export const defaultAuditPath = path.join(repoRoot, 'participant-output', 'audit.jsonl');
export const defaultDraftsDirectory = path.join(repoRoot, 'participant-output', 'drafts');
