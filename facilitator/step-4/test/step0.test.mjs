import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseMessages } from '../lib/messages.mjs';
import { route, routes } from '../lib/switch.mjs';

const run = (...args) => spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, ANTHROPIC_API_KEY: '' } });

test('Step 0: the exercise data is in docs/', () => {
  for (const file of ['customer-messages.md', 'transactions.xlsx', 'customer_context.csv', 'n8n-flow-diagram.html']) {
    assert.ok(existsSync(`docs/${file}`), `docs/${file} is missing`);
  }
});

test('Step 0: docs/customer-messages.md has MSG-01 to MSG-10', () => {
  const markdown = readFileSync('docs/customer-messages.md', 'utf8');
  const messages = parseMessages(markdown);
  assert.deepEqual(messages.map((m) => m.id), Array.from({ length: 10 }, (_, i) => `MSG-${String(i + 1).padStart(2, '0')}`));
  assert.deepEqual(messages.map((m) => m.customer), [
    'CUST-004', 'CUST-001', 'CUST-002', 'CUST-001', 'CUST-003',
    'CUST-005', 'CUST-007', 'CUST-008', 'CUST-004', 'CUST-001',
  ]);
  assert.deepEqual(
    messages.filter((m) => m.customerName).map(({ id, customerName }) => [id, customerName]),
    [['MSG-07', 'Vertex Commerce'], ['MSG-08', 'Futura Labs']],
  );
  assert.ok(messages.every((m) => m.subject && m.customer && m.message));
  assert.deepEqual(parseMessages(markdown.replaceAll('\n', '\r\n')), messages);
});

test('Step 0: the Switch routes known priorities and ignores unknown values', () => {
  assert.deepEqual(route('low'), routes.low);
  assert.deepEqual(route('MEDIUM'), routes.medium);
  assert.deepEqual(route('High'), routes.high);
  assert.equal(route('urgent'), null);
});

test('Step 0: lesson1 dry run works offline, without an API key', () => {
  const result = run('01-single-agent/agent.mjs', 'MSG-01', '--dry-run');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Customer message MSG-01/);
  assert.match(result.stdout, /dry run — no model call, not model evidence/);
});

test('Step 0: the SDK backend requires a key without calling a model', () => {
  const result = run('01-single-agent/agent.mjs', 'MSG-01', '--backend', 'sdk');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /The sdk backend needs ANTHROPIC_API_KEY/);
});

test('Step 0: chat dry run works offline, without an API key', () => {
  const result = run('lib/chat.mjs', '--dry-run');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Claude Code equivalent: claude -p/);
  assert.match(result.stdout, /Chat lesson 1 options:/);
  assert.match(result.stdout, /dry run — no model call, not model evidence/);
});
