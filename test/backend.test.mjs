import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import {
  assertSuccessfulResult,
  backendLabel,
  failedResultMessage,
  runClaudeCode,
  selectBackend,
  toClaudeArgs,
} from '../lib/backend.mjs';
import { formatDoctor, getDoctorReport } from '../lib/doctor.mjs';
import { printEvent } from '../lib/run.mjs';

test('backend selection follows argument, environment, key, then Claude Code defaults', () => {
  assert.equal(selectBackend({ argument: 'sdk-login', env: { AGENT_BACKEND: 'sdk' } }), 'sdk-login');
  assert.equal(selectBackend({ env: { AGENT_BACKEND: 'sdk' } }), 'sdk');
  assert.equal(selectBackend({ env: { ANTHROPIC_API_KEY: 'set' } }), 'sdk');
  assert.equal(selectBackend({ env: {} }), 'claude-code');
  assert.equal(backendLabel('sdk-login'), 'sdk-login (query() on your Claude Code login)');
});

test('toClaudeArgs maps lesson options to Claude Code flags', () => {
  const args = toClaudeArgs('Customer message', {
    settingSources: ['project'],
    maxTurns: 3,
    model: 'sonnet',
    tools: [],
    allowedTools: ['Agent', 'mcp__customers__get_customer'],
    disallowedTools: ['Bash'],
    permissionMode: 'acceptEdits',
    systemPrompt: { type: 'preset', preset: 'claude_code', append: 'Keep answers short.' },
    agents: {
      'risk-agent': { description: 'Review risk.', prompt: 'Assess this ticket.', tools: ['Read'], ignored: true },
    },
    mcpServers: { customers: { type: 'stdio', command: 'node', args: ['customers.js'] } },
    outputFormat: { type: 'json_schema', schema: { type: 'object', required: ['priority'] } },
    resume: 'session-123',
    hooks: {},
  });

  assert.deepEqual(args.slice(0, 5), ['-p', 'Customer message', '--output-format', 'stream-json', '--verbose']);
  assert.ok(args.includes('--tools') && args[args.indexOf('--tools') + 1] === '');
  assert.ok(args.includes('--append-system-prompt') && args.includes('Keep answers short.'));
  assert.ok(args.includes('--setting-sources') && args.includes('project'));
  assert.ok(args.includes('--max-turns') && args.includes('3'));
  assert.ok(args.includes('--allowedTools') && args.includes('Agent,mcp__customers__get_customer'));
  assert.ok(args.includes('--disallowedTools') && args.includes('Bash'));
  assert.ok(args.includes('--permission-mode') && args.includes('acceptEdits'));
  assert.ok(args.includes('--model') && args.includes('sonnet'));
  const agentsJson = JSON.parse(args[args.indexOf('--agents') + 1]);
  assert.deepEqual(agentsJson['risk-agent'], {
    description: 'Review risk.',
    prompt: 'Assess this ticket.',
    tools: ['Read'],
  });
  const mcpConfig = JSON.parse(args[args.indexOf('--mcp-config') + 1]);
  assert.deepEqual(mcpConfig.mcpServers, { customers: { type: 'stdio', command: 'node', args: ['customers.js'] } });
  assert.ok(args.includes('--strict-mcp-config'));
  assert.deepEqual(JSON.parse(args[args.indexOf('--json-schema') + 1]), {
    type: 'object',
    required: ['priority'],
  });
  assert.ok(args.includes('--resume') && args.includes('session-123'));
});

test('failed result events print diagnostics and throw', async () => {
  const event = { type: 'result', subtype: 'error_api', is_error: true, errors: ['request rejected'] };
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  let childOptions;
  const originalError = console.error;
  const diagnostics = [];
  console.error = (message) => diagnostics.push(message);

  try {
    await assert.rejects(runClaudeCode({
      command: 'claude',
      prompt: 'hello',
      options: { cwd: process.cwd() },
      onEvent: printEvent,
      spawnImpl(_command, _args, options) {
        childOptions = options;
        process.nextTick(() => {
          child.stdout.write(`${JSON.stringify(event)}\n`);
          child.stdout.end();
          child.stderr.end();
          child.emit('close', 0, null);
        });
        return child;
      },
    }), /Agent run failed \(error_api\): request rejected/);
    assert.equal(childOptions.env.ANTHROPIC_API_KEY, undefined);
    assert.equal(childOptions.env.PATH, process.env.PATH);
    assert.match(diagnostics.join('\n'), /request rejected/);
    assert.match(failedResultMessage(event), /request rejected/);
    assert.throws(() => assertSuccessfulResult(event), /request rejected/);
  } finally {
    console.error = originalError;
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
  }
});
test('doctor reports a missing CLI without failing', () => {
  const report = getDoctorReport({ env: {}, platform: 'linux', pathValue: '' });
  assert.match(report, /Claude Code: not found/);
  assert.match(report, /Backend: claude-code/);
  assert.match(formatDoctor({
    nodeVersion: 'v22.0.0',
    backend: 'claude-code',
    claudeVersion: '2.1.204',
  }), /below minimum/);
});
