import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { buildOptions } from '../02-subagents/options.mjs';

test('Step 2: the orchestrator has ticket-analyst and email-responder in options.agents', () => {
  const options = buildOptions();
  assert.deepEqual(Object.keys(options.agents), ['ticket-analyst', 'email-responder']);
  assert.ok(options.tools.includes('Agent'));
  for (const agent of Object.values(options.agents)) {
    assert.ok(agent.description.length > 20);
    assert.ok(agent.prompt.length > 100);
    assert.deepEqual(agent.tools, []);
  }
  assert.match(options.agents['email-responder'].prompt, /needs human approval/);
});

test('Step 2: lesson2 dry run works offline', () => {
  const result = spawnSync(process.execPath, ['02-subagents/agent.mjs', 'MSG-05', '--dry-run'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ticket-analyst/);
  assert.match(result.stdout, /dry run — no model call/);
});
