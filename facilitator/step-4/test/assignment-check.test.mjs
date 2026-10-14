import assert from 'node:assert/strict';
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checker = path.join(root, 'scripts', 'check-assignment.mjs');
const fraudAgent = '03-mcp/claude-project/.claude/agents/fraud-check-agent.md';
const hasSolution = existsSync(path.join(root, '03-mcp/resolve.mjs'))
  && existsSync(path.join(root, fraudAgent));

function runCheck(checkRoot = root, args = [], checkScript = checker) {
  return spawnSync(process.execPath, [checkScript, checkRoot, ...args], { encoding: 'utf8' });
}

function output(result) {
  return `${result.stdout}${result.stderr}`;
}

function copySolution() {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'assignment-solution-'));
  const copyRoot = path.join(directory, 'solution');
  cpSync(root, copyRoot, {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(root, source);
      return relative === ''
        || !relative.split(path.sep).some((part) => ['.git', 'node_modules', 'participant-output'].includes(part));
    },
  });
  const modules = path.join(root, 'node_modules');
  if (existsSync(modules)) {
    symlinkSync(modules, path.join(copyRoot, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  }
  return { directory, copyRoot };
}

test('Step 4 reports core items to fix', { skip: hasSolution }, () => {
  const result = runCheck();
  const text = output(result);
  assert.equal(result.status, 1, text);
  assert.match(text, /Core · Parts 1–2: \d+ to fix\./);
  assert.match(text, /Stretch · Parts 3–4:/);
  assert.match(text, /Assignment check failed\. Fix the core items first\./);
});

test('an unfinished copy fails with actionable instructions', () => {
  const emptyRoot = mkdtempSync(path.join(os.tmpdir(), 'assignment-check-'));
  try {
    const result = runCheck(emptyRoot);
    const text = output(result);
    assert.equal(result.status, 1, text);
    assert.match(text, /Create 03-mcp\/claude-project\/\.claude\/agents\/transaction-agent\.md/);
    assert.match(text, /Create 03-mcp\/claude-project\/\.claude\/agents\/fraud-check-agent\.md/);
    assert.match(text, /AskUserQuestion in orchestrator tools/);
    assert.match(text, /Assignment check failed\. Fix the core items first\./);
  } finally {
    rmSync(emptyRoot, { recursive: true, force: true });
  }
});

test('agent files need a name in their frontmatter', () => {
  const incompleteRoot = mkdtempSync(path.join(os.tmpdir(), 'assignment-agent-'));
  try {
    const agentPath = path.join(incompleteRoot, '03-mcp/claude-project/.claude/agents');
    mkdirSync(agentPath, { recursive: true });
    writeFileSync(
      path.join(agentPath, 'fraud-check-agent.md'),
      '---\ndescription: Check transaction risk.\ntools: mcp__transactions__get_transaction, mcp__transactions__list_transactions, mcp__customers__get_customer\n---\n',
    );
    const result = runCheck(incompleteRoot);
    assert.equal(result.status, 1);
    assert.match(output(result), /Set the fraud-check-agent name in its frontmatter/);
  } finally {
    rmSync(incompleteRoot, { recursive: true, force: true });
  }
});

test('a solution with only the fraud-check-agent stretch item open passes core', { skip: !hasSolution }, () => {
  const { directory, copyRoot } = copySolution();
  try {
    rmSync(path.join(copyRoot, fraudAgent));
    const result = runCheck(copyRoot, [], path.join(copyRoot, 'scripts', 'check-assignment.mjs'));
    const text = output(result);
    assert.equal(result.status, 0, text);
    assert.match(text, /Core · Parts 1–2: passed\./);
    assert.match(text, /fraud-check-agent/);
    assert.match(text, /Core passed\. Do the stretch parts if you have time\./);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('strict mode fails when the solution has open stretch items', { skip: !hasSolution }, () => {
  const { directory, copyRoot } = copySolution();
  try {
    rmSync(path.join(copyRoot, fraudAgent));
    const result = runCheck(copyRoot, ['--strict'], path.join(copyRoot, 'scripts', 'check-assignment.mjs'));
    const text = output(result);
    assert.equal(result.status, 1, text);
    assert.match(text, /Core · Parts 1–2: passed\./);
    assert.match(text, /fraud-check-agent/);
    assert.match(text, /Stretch is required with --strict\./);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('the complete solution passes the offline assignment check', { skip: !hasSolution }, () => {
  const result = runCheck();
  assert.equal(result.status, 0, output(result));
  assert.match(result.stdout, /Assignment check passed\. The agent tools, hooks, and questions meet the rules\./);
});
