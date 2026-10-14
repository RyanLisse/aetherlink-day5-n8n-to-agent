import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const writeTools = [
  'mcp__transactions__add_transaction',
  'mcp__transactions__delete_transaction',
  'mcp__transactions__update_transaction',
];
const transactionAgentTools = [
  'mcp__transactions__get_transaction',
  'mcp__transactions__update_transaction',
  'mcp__transactions__add_transaction',
];
const issues = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : null;
}

function requireFile(relativePath) {
  if (!read(relativePath)) {
    issues.push(`Create ${relativePath}.`);
    return false;
  }
  return true;
}

function containsAll(text, words) {
  return words.every((word) => text.toLowerCase().includes(word));
}

async function checkAgents() {
  const agentPath = '03-mcp/claude-project/.claude/agents/transaction-agent.md';
  const agentText = read(agentPath);
  if (!agentText) {
    issues.push(`Create ${agentPath} with get, update and add tools.`);
  } else {
    const toolsLine = agentText.match(/^tools:\s*(.+)$/m)?.[1] ?? '';
    const actual = toolsLine.split(',').map((tool) => tool.trim()).filter(Boolean).sort();
    const expected = [...transactionAgentTools].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      issues.push(`Set transaction-agent tools to exactly: ${transactionAgentTools.join(', ')}.`);
    }
  }

  const optionsPath = path.join(root, '03-mcp/options.mjs');
  if (!existsSync(optionsPath)) {
    issues.push('Update 03-mcp/options.mjs with buildResolveOptions().');
    return null;
  }

  const { buildResolveOptions } = await import(pathToFileURL(optionsPath).href);
  if (typeof buildResolveOptions !== 'function') {
    issues.push('Add buildResolveOptions() for the assignment in 03-mcp/options.mjs.');
    return null;
  }

  const options = buildResolveOptions({ backend: 'sdk' });
  const transactionAgent = options.agents?.['transaction-agent'];
  if (!transactionAgent) {
    issues.push('Add transaction-agent to the SDK agents option.');
  } else {
    const actual = [...(transactionAgent.tools ?? [])].sort();
    if (JSON.stringify(actual) !== JSON.stringify([...transactionAgentTools].sort())) {
      issues.push(`Give SDK transaction-agent exactly: ${transactionAgentTools.join(', ')}.`);
    }
  }
  if ((options.allowedTools ?? []).some((tool) => writeTools.includes(tool))) {
    issues.push('Remove write tools from the orchestrator allowedTools.');
  }
  for (const name of ['risk-agent', 'customer-context-agent', 'customer-reply-agent']) {
    if ((options.agents?.[name]?.tools ?? []).some((tool) => writeTools.includes(tool))) {
      issues.push(`Remove write tools from ${name}.`);
    }
  }
  return options;
}

function checkClaudeCode(options) {
  const settings = read('03-mcp/claude-project/.claude/settings.json');
  if (!settings) {
    issues.push('Add Claude Code PreToolUse and PostToolUse hooks in 03-mcp/claude-project/.claude/settings.json.');
    return;
  }
  let config;
  try {
    config = JSON.parse(settings);
  } catch {
    issues.push('Fix the JSON in 03-mcp/claude-project/.claude/settings.json.');
    return;
  }
  const commands = Object.values(config.hooks ?? {}).flat().flatMap((group) => group.hooks ?? [])
    .map((hook) => hook.command ?? '');
  if (!commands.some((command) => command.includes('node ../hooks/transaction-guard.mjs pre'))) {
    issues.push('Add the PreToolUse command hook: node ../hooks/transaction-guard.mjs pre.');
  }
  if (!commands.some((command) => command.includes('node ../hooks/transaction-guard.mjs post'))) {
    issues.push('Add the PostToolUse command hook: node ../hooks/transaction-guard.mjs post.');
  }
  if (!options?.hooks?.PreToolUse?.length || !options?.hooks?.PostToolUse?.length) {
    issues.push('Register SDK PreToolUse and PostToolUse callbacks in buildResolveOptions().');
  }
}

async function checkHookDecisions() {
  const guardPath = path.join(root, '03-mcp/hooks/transaction-guard.mjs');
  if (!existsSync(guardPath)) {
    issues.push('Create 03-mcp/hooks/transaction-guard.mjs with conditional write decisions.');
    return;
  }
  const { evaluatePreToolUse } = await import(pathToFileURL(guardPath).href);
  if (typeof evaluatePreToolUse !== 'function') {
    issues.push('Export evaluatePreToolUse() from 03-mcp/hooks/transaction-guard.mjs.');
    return;
  }
  const lookupTransaction = async (transactionId) => ({
    'TX-1003': { transactionId: 'TX-1003', amount: 780, status: 'PENDING' },
    'TX-1004': { transactionId: 'TX-1004', amount: 19.95, status: 'COMPLETED' },
  })[transactionId] ?? null;
  const cases = [
    ['mcp__transactions__get_transaction', { transaction_id: 'TX-1003' }, 'allow'],
    ['mcp__transactions__update_transaction', { transaction_id: 'TX-1004', status: 'COMPLETED' }, 'allow'],
    ['mcp__transactions__update_transaction', { transaction_id: 'TX-1003', status: 'COMPLETED' }, 'ask'],
    ['mcp__transactions__add_transaction', { customer: 'Check BV', amount: 10 }, 'ask'],
    ['mcp__transactions__delete_transaction', { transaction_id: 'TX-1004' }, 'ask'],
  ];
  for (const [tool_name, tool_input, expected] of cases) {
    const result = await evaluatePreToolUse({ tool_name, tool_input }, { lookupTransaction });
    if (result.action !== expected) {
      issues.push(`${tool_name} should produce "${expected}", got "${result.action}".`);
    }
  }
}

const agentOptions = await checkAgents();
checkClaudeCode(agentOptions);
requireFile('03-mcp/transaction-mcp/server.js');
requireFile('03-mcp/transaction-mcp/store.mjs');
await checkHookDecisions();

if (issues.length > 0) {
  console.error('Assignment check failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  console.error('Complete the assignment tasks in SOLO.md, then run npm run check:assignment again.');
  process.exitCode = 1;
} else {
  console.log('Assignment check passed: least privilege, hooks and conditional decisions are configured.');
}
