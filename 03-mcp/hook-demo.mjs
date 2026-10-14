import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hookPath = path.join(root, '03-mcp', 'hooks', 'transaction-guard.mjs');
const demos = {
  small: {
    note: 'TX-1002; amount €49.99',
    tool_name: 'mcp__transactions__update_transaction',
    tool_input: { transaction_id: 'TX-1002', status: 'COMPLETED' },
  },
  large: {
    note: 'TX-1007; amount €899',
    tool_name: 'mcp__transactions__update_transaction',
    tool_input: { transaction_id: 'TX-1007', status: 'COMPLETED' },
  },
  add: {
    tool_name: 'mcp__transactions__add_transaction',
    tool_input: { customer: 'Vertex Commerce', amount: 899, status: 'PENDING' },
  },
  delete: {
    tool_name: 'mcp__transactions__delete_transaction',
    tool_input: { transaction_id: 'TX-1007' },
  },
  read: {
    tool_name: 'mcp__transactions__get_transaction',
    tool_input: { transaction_id: 'TX-1007' },
  },
};

const name = process.argv[2];
const demo = demos[name];
if (!demo) {
  console.error('Use one case: small, large, add, delete, or read.');
  process.exitCode = 1;
} else if (!existsSync(hookPath)) {
  console.error('Write 03-mcp/hooks/transaction-guard.mjs first (Part 2). Then run npm run hook:demo again.');
  process.exitCode = 1;
} else {
  const { note, ...input } = demo;
  const result = spawnSync(process.execPath, [hookPath, 'pre'], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exitCode = result.status ?? 1;
  } else {
    const output = JSON.parse(result.stdout);
    console.log(`Case: ${name}`);
    console.log(`Tool: ${input.tool_name}`);
    if (note) console.log(`Fixture: ${note}`);
    console.log(`Decision: ${output.hookSpecificOutput.permissionDecision}`);
    if (output.hookSpecificOutput.permissionDecisionReason) {
      console.log(`Reason: ${output.hookSpecificOutput.permissionDecisionReason}`);
    }
    console.log('This fixture does not call the tool or change data.');
  }
}
