import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('draft server creates a folder, writes the review header, and replaces a draft', () => {
  const result = spawnSync(process.execPath, [
    path.join(root, '03-mcp', 'transaction-mcp', 'smoke-drafts.mjs'),
  ], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Draft smoke passed/);
});
