import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseMessages } from '../lib/messages.mjs';

const run = (...args) => spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, ANTHROPIC_API_KEY: '' } });

test('Step 0: the exercise data is in docs/', () => {
  for (const file of ['customer-messages.md', 'transactions.xlsx', 'customer_context.csv', 'n8n-flow-diagram.html']) {
    assert.ok(existsSync(`docs/${file}`), `docs/${file} is missing`);
  }
});

test('Step 0: docs/customer-messages.md has MSG-01 to MSG-10', () => {
  const messages = parseMessages(readFileSync('docs/customer-messages.md', 'utf8'));
  assert.deepEqual(messages.map((m) => m.id), Array.from({ length: 10 }, (_, i) => `MSG-${String(i + 1).padStart(2, '0')}`));
  assert.ok(messages.every((m) => m.subject && m.message));
});

test('Step 0: lesson1 dry run works offline, without an API key', () => {
  const result = run('01-single-agent/agent.mjs', 'MSG-01', '--dry-run');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Customer message MSG-01/);
  assert.match(result.stdout, /dry run — no model call, not model evidence/);
});

test('Step 0: a real run without a key stops with a clear message', () => {
  const result = run('01-single-agent/agent.mjs', 'MSG-01');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Set ANTHROPIC_API_KEY/);
});
