import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { buildOptions } from '../03-mcp/options.mjs';

test('Step 3: transaction and customer servers use read-only tools and the workbook', () => {
  const { mcpServers, allowedTools, agents } = buildOptions();
  const server = mcpServers.transactions;
  const customers = mcpServers.customers;
  assert.equal(server.type, 'stdio');
  assert.equal(path.basename(server.args[0]), 'server.js');
  assert.equal(path.relative(process.cwd(), server.env.TRANSACTIONS_XLSX).split(path.sep).join('/'), 'docs/transactions.xlsx');
  assert.deepEqual(Object.keys(server.env), ['TRANSACTIONS_XLSX']);
  assert.ok(allowedTools.includes('mcp__transactions__get_transaction'));
  assert.ok(allowedTools.includes('mcp__transactions__list_transactions'));
  assert.equal(path.basename(customers.args[0]), 'customers.js');
  assert.equal(path.relative(process.cwd(), customers.env.CUSTOMER_CONTEXT_CSV).split(path.sep).join('/'), 'docs/customer_context.csv');
  assert.ok(allowedTools.includes('mcp__customers__get_customer'));
  assert.deepEqual(agents['risk-agent'].tools, ['mcp__transactions__get_transaction']);
  assert.deepEqual(agents['customer-context-agent'].tools, ['mcp__customers__get_customer']);
  assert.deepEqual(agents['customer-reply-agent'].tools, []);
  assert.deepEqual(Object.keys(agents), ['risk-agent', 'customer-reply-agent', 'customer-context-agent']);
});

test('Step 3: .mcp.json exposes the same server to Claude Code', () => {
  assert.ok(existsSync('.mcp.json'));
  const config = JSON.parse(readFileSync('.mcp.json', 'utf8'));
  assert.deepEqual(config.mcpServers.transactions.args, ['03-mcp/transaction-mcp/server.js']);
  assert.deepEqual(config.mcpServers.customers.args, ['03-mcp/transaction-mcp/customers.js']);
});

test('Step 3: lesson3 dry run works offline', () => {
  const result = spawnSync(process.execPath, ['03-mcp/agent.mjs', 'MSG-08', '--dry-run'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Claude Code equivalent:/);
});
