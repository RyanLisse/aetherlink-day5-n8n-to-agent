import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('resolve dry run prints the fixed workflow without a model call', () => {
  const result = spawnSync(process.execPath, [
    path.join(root, '03-mcp', 'resolve.mjs'), 'MSG-07', '--backend', 'sdk', '--dry-run',
  ], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Look up the customer and the transaction/);
  assert.match(result.stdout, /fraud-check-agent/);
  assert.match(result.stdout, /hold is true or risk is high/);
  assert.match(result.stdout, /Ask one question/);
  assert.match(result.stdout, /Continue only after the person selects Continue/);
  assert.match(result.stdout, /Stop with ESCALATE after any other answer or a denied write/);
  const resolvePrompt = readFileSync(path.join(root, '03-mcp/resolve.mjs'), 'utf8');
  assert.match(resolvePrompt, /Tell transaction-agent to use only facts from the ticket and tool results/);
  assert.match(resolvePrompt, /Tell transaction-agent to copy each status or detail exactly/);
  assert.match(result.stdout, /Use only facts from the ticket and tool results/);
  assert.match(result.stdout, /State each transaction status exactly as the tool result shows it/);
  assert.match(result.stdout, /Do not say that the team reviews the case unless a tool result confirms it/);
  assert.match(result.stdout, /Do not promise future help unless a tool result confirms it/);
  assert.match(result.stdout, /Do not claim or promise a refund, release, or date/);
  assert.doesNotMatch(result.stdout, /TX-1003|training target/);
  assert.match(result.stdout, /dry run — no model call/);
});

test('customer reply agent and project instructions prohibit unsupported claims', () => {
  const customerReplyAgent = readFileSync(
    path.join(root, '03-mcp/claude-project/.claude/agents/customer-reply-agent.md'),
    'utf8',
  );
  const claudeInstructions = readFileSync(
    path.join(root, '03-mcp/claude-project/CLAUDE.md'),
    'utf8',
  );
  const resolveCommand = readFileSync(
    path.join(root, '03-mcp/claude-project/.claude/commands/resolve-ticket.md'),
    'utf8',
  );
  const resolveSource = readFileSync(path.join(root, '03-mcp/resolve.mjs'), 'utf8');

  for (const instructions of [customerReplyAgent, claudeInstructions]) {
    assert.match(instructions, /Use only facts from the ticket and tool results/);
    assert.match(instructions, /State each transaction status exactly as the tool result shows it/);
    assert.match(instructions, /Do not say that the team reviews the case unless a tool result confirms it/);
    assert.match(instructions, /Do not promise future help unless a tool result confirms it/);
    assert.match(instructions, /Do not claim or promise a refund, release, or date/);
  }
  for (const instructions of [resolveCommand, resolveSource]) {
    assert.match(instructions, /customer-reply-agent`? to use only facts from the ticket and tool results/);
    assert.match(instructions, /customer-reply-agent`? to state each transaction status exactly as the tool result shows it/);
    assert.match(instructions, /customer-reply-agent`? not to say that the team reviews the case unless a tool result confirms it/);
    assert.match(instructions, /customer-reply-agent`? not to promise future help unless a tool result confirms it/);
    assert.match(instructions, /customer-reply-agent`? not to claim or promise a refund, release, or date/);
  }
});

test('transaction-agent writes use only source facts and exact details', () => {
  const transactionAgent = readFileSync(
    path.join(root, '03-mcp/claude-project/.claude/agents/transaction-agent.md'),
    'utf8',
  );
  const claudeInstructions = readFileSync(
    path.join(root, '03-mcp/claude-project/CLAUDE.md'),
    'utf8',
  );

  for (const instructions of [transactionAgent, claudeInstructions]) {
    assert.match(instructions, /Use only facts from the ticket and tool results/);
    assert.match(instructions, /Copy each status or detail exactly/);
  }
});
