import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { agents } from '../02-subagents/agents.mjs';
import { buildOptions } from '../02-subagents/options.mjs';
import { ticketSchema } from '../02-subagents/ticket-schema.mjs';

test('Step 2: risk and customer-reply agents are loaded with the intended prompts', () => {
  assert.deepEqual(Object.keys(agents), ['risk-agent', 'customer-reply-agent']);
  for (const agent of Object.values(agents)) {
    assert.ok(agent.description.length > 20);
    assert.ok(agent.prompt.length > 100);
    assert.deepEqual(agent.tools, []);
  }
  assert.match(agents['risk-agent'].prompt, /Risk note:/);
  assert.match(agents['customer-reply-agent'].prompt, /Do not mention the internal risk note or the priority/);
});

test('Step 2: structured ticket schema has all required fields and valid labels', () => {
  assert.deepEqual(ticketSchema, {
    type: 'object',
    properties: {
      priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      sentiment: { type: 'string', enum: ['neutral', 'frustrated', 'angry'] },
      recommended_action: { type: 'string', enum: ['auto_reply', 'investigate', 'escalate'] },
      summary: { type: 'string' },
      risk_note: { type: 'string' },
      customer_reply: { type: 'string' },
    },
    required: ['priority', 'sentiment', 'recommended_action', 'summary', 'risk_note', 'customer_reply'],
    additionalProperties: false,
  });
  assert.deepEqual(buildOptions().outputFormat, { type: 'json_schema', schema: ticketSchema });
});

test('Step 2: lesson and chat dry runs work offline', () => {
  const lesson = spawnSync(process.execPath, ['02-subagents/agent.mjs', 'MSG-05', '--dry-run'], { encoding: 'utf8' });
  assert.equal(lesson.status, 0, lesson.stderr);
  assert.match(lesson.stdout, /risk-agent/);
  assert.match(lesson.stdout, /outputFormat/);
  assert.match(lesson.stdout, /dry run — no model call/);

  const chat = spawnSync(process.execPath, ['lib/chat.mjs', '--lesson', '2', '--dry-run'], { encoding: 'utf8' });
  assert.equal(chat.status, 0, chat.stderr);
  assert.match(chat.stdout, /Chat lesson 2 options/);
  assert.doesNotMatch(chat.stdout, /outputFormat/);
});
