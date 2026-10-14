import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(root, '03-mcp', 'hook-demo.mjs');

test('hook demo sends each fixture to the Claude Code hook process', () => {
  for (const [name, decision] of [
    ['small', 'allow'],
    ['large', 'ask'],
    ['add', 'ask'],
    ['delete', 'ask'],
    ['read', 'allow'],
  ]) {
    const result = spawnSync(process.execPath, [demo, name], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, new RegExp(`Case: ${name}`));
    assert.match(result.stdout, new RegExp(`Decision: ${decision}`));
    if (name === 'small') assert.match(result.stdout, /TX-1002; amount €49\.99/);
    if (name === 'large') assert.match(result.stdout, /TX-1007; amount €899/);
    assert.match(result.stdout, /This fixture does not call the tool or change data/);
  }
});
