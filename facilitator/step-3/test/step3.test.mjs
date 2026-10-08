import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { approvalDecision } from '../03-mcp/approval.mjs';
import { buildOptions } from '../03-mcp/options.mjs';

test('Step 3: the transactions MCP server is wired as stdio and reads docs/transactions.xlsx', () => {
  const { mcpServers, allowedTools, canUseTool, agents } = buildOptions();
  const server = mcpServers.transactions;
  assert.equal(server.type, 'stdio');
  assert.equal(path.basename(server.args[0]), 'server.js');
  assert.equal(path.relative(process.cwd(), server.env.TRANSACTIONS_XLSX).split(path.sep).join('/'), 'docs/transactions.xlsx');
  assert.ok(allowedTools.includes('mcp__transactions__get_transaction'));
  assert.equal(typeof canUseTool, 'function');
  assert.deepEqual(agents['ticket-analyst'].tools, ['mcp__transactions__get_transaction']);
  assert.deepEqual(agents['email-responder'].tools, []);
});

test('Step 3: .mcp.json exposes the same server to Claude Code', () => {
  assert.ok(existsSync('.mcp.json'));
  const config = JSON.parse(readFileSync('.mcp.json', 'utf8'));
  assert.deepEqual(config.mcpServers.transactions.args, ['03-mcp/transaction-mcp/server.js']);
});

test('Step 3: the approval gate allows a write only after y', () => {
  const tool = 'mcp__transactions__update_transaction';
  assert.equal(approvalDecision(tool, {}, 'y').behavior, 'allow');
  assert.equal(approvalDecision(tool, {}, '').behavior, 'deny');
  assert.equal(approvalDecision(tool, {}, 'n').behavior, 'deny');
  assert.equal(approvalDecision('Bash', {}, 'y').behavior, 'deny');
});

test('Step 3: lesson3 dry run works offline', () => {
  const result = spawnSync(process.execPath, ['03-mcp/agent.mjs', 'MSG-08', '--dry-run'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /canUseTool asks a person/);
});
