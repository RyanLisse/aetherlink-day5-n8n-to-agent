import assert from 'node:assert/strict';
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(root, '03-mcp', 'hook-demo.mjs');

function runNpm(args, options) {
  if (process.env.npm_execpath) {
    return spawnSync(process.execPath, [process.env.npm_execpath, ...args], options);
  }
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return spawnSync(npm, args, { ...options, shell: process.platform === 'win32' });
}

test('reset:mcp removes the working copy and succeeds when it is missing', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'assignment-reset-'));
  const storePath = path.join(directory, 'participant-output', 'transactions.working.json');
  const draftsDirectory = path.join(directory, 'participant-output', 'drafts');
  mkdirSync(path.dirname(storePath), { recursive: true });
  writeFileSync(storePath, '{}\n');
  const env = { ...process.env, TRANSACTIONS_STORE: storePath, DRAFTS_DIR: draftsDirectory };

  try {
    let result = runNpm(['run', 'reset:mcp'], { cwd: root, encoding: 'utf8', env });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(storePath), false);

    result = runNpm(['run', 'reset:mcp'], { cwd: root, encoding: 'utf8', env });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('hook:demo reports when the transaction guard is missing', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'assignment-hook-demo-'));
  const demoDirectory = path.join(directory, '03-mcp');
  mkdirSync(demoDirectory);
  const copiedDemo = path.join(demoDirectory, 'hook-demo.mjs');
  copyFileSync(demo, copiedDemo);
  copyFileSync(path.join(root, 'package.json'), path.join(directory, 'package.json'));

  try {
    const result = runNpm(['run', 'hook:demo', '--', 'small'], {
      cwd: directory,
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(
      `${result.stdout}${result.stderr}`,
      /Write 03-mcp\/hooks\/transaction-guard\.mjs first \(Part 2\)\. Then run npm run hook:demo again\./,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
