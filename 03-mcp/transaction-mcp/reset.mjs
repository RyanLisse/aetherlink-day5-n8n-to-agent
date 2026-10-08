import { rmSync } from 'node:fs';
import { defaultStorePath } from './paths.mjs';

rmSync(process.env.TRANSACTIONS_STORE ?? defaultStorePath, { force: true });
console.log('Working copy removed; the next run starts from transactions.xlsx again.');
