import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { buildOptions } from '../01-single-agent/options.mjs';

test('Step 1: one agent loads CLAUDE.md through settingSources', () => {
  const options = buildOptions();
  assert.equal(path.basename(options.cwd), 'claude-project');
  assert.deepEqual(options.settingSources, ['project']);
  assert.deepEqual(options.systemPrompt, { type: 'preset', preset: 'claude_code' });
  assert.deepEqual(options.tools, []);
  assert.equal(options.maxTurns, 2);
});

test('Step 1: CLAUDE.md is filled in and keeps the priority definitions', () => {
  const claude = readFileSync('01-single-agent/claude-project/CLAUDE.md', 'utf8');
  assert.doesNotMatch(claude, /TODO/);
  for (const heading of ['## Purpose', '## Rules', '## Priority definitions', '## Required output']) {
    assert.ok(claude.includes(heading), `missing ${heading}`);
  }
  assert.match(claude, /not tone/);
});
