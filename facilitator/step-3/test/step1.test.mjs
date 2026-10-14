import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { prioritySchema } from '../01-single-agent/priority-schema.mjs';
import { buildOptions } from '../01-single-agent/options.mjs';
import { parseArgs, selectChatOptions } from '../lib/chat-options.mjs';

test('Step 1: priority schema requires a supported priority and reason', () => {
  assert.deepEqual(prioritySchema, {
    type: 'object',
    properties: {
      priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      reason: { type: 'string' },
    },
    required: ['priority', 'reason'],
    additionalProperties: false,
  });
});

test('Step 1: options use JSON schema output and preserve the priority definitions', () => {
  const options = buildOptions();
  assert.equal(options.maxTurns, 3);
  assert.deepEqual(options.outputFormat, { type: 'json_schema', schema: prioritySchema });

  const claude = readFileSync('01-single-agent/claude-project/CLAUDE.md', 'utf8');
  assert.doesNotMatch(claude, /TODO/);
  assert.match(claude, /Judge impact and risk, not tone/);
  assert.match(claude, /The SDK turns this into JSON \(the Priority Parser\)\./);
});

test('Step 1: chat dry run loads structured lesson options without a model call', () => {
  const result = spawnSync(process.execPath, ['lib/chat.mjs', '--lesson', '1', '--dry-run'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Chat lesson 1 options/);
  assert.match(result.stdout, /dry run — no model call, not model evidence/);
  assert.doesNotMatch(result.stdout, /outputFormat/);
});

test('Step 1: structured chat preserves the lesson schema in its dry run', () => {
  const args = parseArgs(['--lesson', '1', '--structured', '--dry-run']);
  assert.equal(args.structured, true);
  const result = spawnSync(process.execPath, ['lib/chat.mjs', '--lesson', '1', '--structured', '--dry-run'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /outputFormat/);
  assert.match(result.stdout, /--json-schema/);
});

test('Step 1: structured chat requires an output format', () => {
  assert.throws(
    () => selectChatOptions({ tools: [] }, { lesson: '3', structured: true }),
    /Lesson 3 has no structured output format; --structured requires outputFormat/,
  );
});
