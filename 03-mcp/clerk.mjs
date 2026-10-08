import { runQuery } from '../lib/run.mjs';
import { APPROVAL_NOTE } from './approval.mjs';
import { buildOptions } from './options.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const instruction = args.filter((arg) => arg !== '--dry-run');

if (instruction.length !== 1 || !instruction[0].trim()) {
  throw new Error('Usage: node 03-mcp/clerk.mjs "<staff instruction>" [--dry-run]');
}

await runQuery({
  prompt: `Staff instruction:\n${instruction[0].trim()}`,
  options: buildOptions(),
  dryRun,
  dryRunNote: APPROVAL_NOTE,
});
