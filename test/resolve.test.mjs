import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('resolve dry run prints the fixed workflow without a model call', () => {
  const result = spawnSync(process.execPath, [
    path.join(root, '03-mcp', 'resolve.mjs'), 'MSG-03', '--backend', 'sdk', '--dry-run',
  ], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Look up the customer and the transaction/);
  assert.match(result.stdout, /fraud-check-agent/);
  assert.match(result.stdout, /hold is true or risk is high/);
  assert.match(result.stdout, /Ask one question/);
  assert.match(result.stdout, /Continue after approval/);
  assert.match(result.stdout, /Stop with ESCALATE after denial/);
  assert.match(result.stdout, /dry run — no model call/);
});
