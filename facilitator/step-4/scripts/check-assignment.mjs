import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const root = path.resolve(args.find((arg) => arg !== '--strict') ?? process.cwd());
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
const fraudCheckAgentTools = [
  'mcp__transactions__get_transaction',
  'mcp__transactions__list_transactions',
  'mcp__customers__get_customer',
];
const draftTool = 'mcp__drafts__save_reply_draft';
const questionTool = 'AskUserQuestion';
const denialReason = 'Denied by a human reviewer. Do not retry this write or delegate it; report it and stop.';
const core = [];
const stretch = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : null;
}

function requireFile(relativePath, issues, message = `Create ${relativePath}.`) {
  if (!read(relativePath)) {
    issues.push(message);
    return false;
  }
  return true;
}

function readJson(relativePath, issues, missingMessage) {
  const text = read(relativePath);
  if (!text) {
    issues.push(missingMessage);
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    issues.push(`Fix the JSON in ${relativePath}.`);
    return null;
  }
}

function containsAll(text, words) {
  return words.every((word) => text.toLowerCase().includes(word));
}

function readAgentTools(agentText) {
  const toolsLine = agentText?.match(/^tools:\s*(.+)$/m)?.[1] ?? '';
  return toolsLine.split(',').map((tool) => tool.trim()).filter(Boolean).sort();
}

function hasAgentName(agentText, name) {
  return agentText?.match(/^name:\s*(.+)$/m)?.[1]?.trim() === name;
}

function agentFiles() {
  const directory = path.join(root, '03-mcp/claude-project/.claude/agents');
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({
      name: path.basename(file, '.md'),
      text: read(`03-mcp/claude-project/.claude/agents/${file}`) ?? '',
    }));
}

function checkTransactionAgentFile() {
  const agentPath = '03-mcp/claude-project/.claude/agents/transaction-agent.md';
  const agentText = read(agentPath);
  if (!agentText) {
    core.push(`Create ${agentPath} with get, update and add tools.`);
    return;
  }
  if (!hasAgentName(agentText, 'transaction-agent')) {
    core.push('Set the transaction-agent name in its frontmatter.');
  }
  if (JSON.stringify(readAgentTools(agentText)) !== JSON.stringify([...transactionAgentTools].sort())) {
    core.push(`Set transaction-agent tools to exactly: ${transactionAgentTools.join(', ')}.`);
  }
}

async function loadOptions() {
  const optionsPath = path.join(root, '03-mcp/options.mjs');
  if (!existsSync(optionsPath)) {
    stretch.push('Add buildResolveOptions() to 03-mcp/options.mjs.');
    return { options: null, step3Options: null, claudeCodeOptions: null };
  }

  let optionsModule;
  try {
    optionsModule = await import(pathToFileURL(optionsPath).href);
  } catch {
    stretch.push('Fix the SDK options in 03-mcp/options.mjs.');
    return { options: null, step3Options: null, claudeCodeOptions: null };
  }

  if (typeof optionsModule.buildResolveOptions !== 'function') {
    stretch.push('Add buildResolveOptions() for the resolve workflow.');
    let step3Options = null;
    try {
      if (typeof optionsModule.buildOptions === 'function') step3Options = optionsModule.buildOptions();
    } catch {
      step3Options = null;
    }
    return {
      options: null,
      step3Options,
      claudeCodeOptions: null,
    };
  }

  let options;
  let claudeCodeOptions;
  let step3Options;
  try {
    options = optionsModule.buildResolveOptions({ backend: 'sdk' });
    claudeCodeOptions = optionsModule.buildResolveOptions({ backend: 'claude-code' });
  } catch {
    core.push('Build the SDK assignment options with transaction-agent and hooks.');
    stretch.push('Build the resolve options for both backends.');
    options = null;
    claudeCodeOptions = null;
  }
  try {
    step3Options = typeof optionsModule.buildOptions === 'function'
      ? optionsModule.buildOptions()
      : null;
  } catch {
    step3Options = null;
  }
  if (!step3Options) {
    stretch.push('Keep the Step 3 options available in 03-mcp/options.mjs.');
  }
  return { options, step3Options, claudeCodeOptions };
}

function checkCoreSdkOptions(options) {
  if (!options) {
    core.push('Add transaction-agent to the SDK assignment options.');
    core.push('Keep transaction write tools out of SDK allowedTools.');
    core.push('Register SDK PreToolUse and PostToolUse callbacks.');
    return;
  }

  const transactionAgent = options.agents?.['transaction-agent'];
  if (!transactionAgent) {
    core.push('Add transaction-agent to the SDK agents option.');
  } else if (
    JSON.stringify([...(transactionAgent.tools ?? [])].sort())
    !== JSON.stringify([...transactionAgentTools].sort())
  ) {
    core.push(`Give SDK transaction-agent exactly: ${transactionAgentTools.join(', ')}.`);
  }
  if ((options.allowedTools ?? []).some((tool) => writeTools.includes(tool))) {
    core.push('Remove transaction write tools from orchestrator allowedTools.');
  }

  const writers = new Set();
  for (const [name, agent] of Object.entries(options.agents ?? {})) {
    if (name !== 'transaction-agent' && (agent.tools ?? []).some((tool) => writeTools.includes(tool))) {
      writers.add(name);
    }
  }
  for (const { name, text } of agentFiles()) {
    if (name !== 'transaction-agent' && readAgentTools(text).some((tool) => writeTools.includes(tool))) {
      writers.add(name);
    }
  }
  for (const name of writers) {
    core.push(`Remove transaction write tools from ${name}.`);
  }

  if (!options.hooks?.PreToolUse?.length || !options.hooks?.PostToolUse?.length) {
    core.push('Register SDK PreToolUse and PostToolUse callbacks.');
  }
}

function checkClaudeCode(options) {
  const settings = read('03-mcp/claude-project/.claude/settings.json');
  if (!settings) {
    core.push('Add Claude Code PreToolUse and PostToolUse hooks in 03-mcp/claude-project/.claude/settings.json.');
    return;
  }
  let config;
  try {
    config = JSON.parse(settings);
  } catch {
    core.push('Fix the JSON in 03-mcp/claude-project/.claude/settings.json.');
    return;
  }
  const commands = Object.values(config.hooks ?? {}).flat().flatMap((group) => group.hooks ?? [])
    .map((hook) => hook.command ?? '');
  if (!commands.some((command) => command.includes('node ../hooks/transaction-guard.mjs pre'))) {
    core.push('Add the PreToolUse command hook: node ../hooks/transaction-guard.mjs pre.');
  }
  if (!commands.some((command) => command.includes('node ../hooks/transaction-guard.mjs post'))) {
    core.push('Add the PostToolUse command hook: node ../hooks/transaction-guard.mjs post.');
  }
}

function checkClaudeRules() {
  const text = read('03-mcp/claude-project/CLAUDE.md')?.toLowerCase() ?? '';
  const coreRules = [
    ['only transaction-agent writes', ['only', 'transaction-agent', 'changes transactions']],
    ['look up a transaction before each write', ['always look up a transaction before you write']],
    ['a denied write is final', ['a denied write is final', 'do not retry it', 'ask another agent']],
  ];
  for (const [label, keywords] of coreRules) {
    if (!containsAll(text, keywords)) core.push(`Add the CLAUDE.md rule: ${label}.`);
  }

  const stretchRules = [
    ['run fraud-check-agent before a write and stop on hold', [
      'call fraud-check-agent before a transaction write',
      'if it says hold, do not write',
    ]],
    ['ask with AskUserQuestion when risk is medium or a fact is missing', [
      'ask the person with askuserquestion',
      'a fact is missing',
      'do not guess',
    ]],
    ['save drafts with customer-reply-agent', [
      'ask customer-reply-agent to save drafts with',
      'mcp__drafts__save_reply_draft',
    ]],
    ['use confirmed facts in customer reply drafts', [
      'use only facts from the ticket and tool results in customer reply drafts',
      'state each transaction status exactly',
    ]],
  ];
  for (const [label, keywords] of stretchRules) {
    if (!containsAll(text, keywords)) stretch.push(`Add the CLAUDE.md rule: ${label}.`);
  }
}

function checkFilesAndScripts() {
  requireFile(
    '03-mcp/transaction-mcp/store.mjs',
    core,
    'Create 03-mcp/transaction-mcp/store.mjs for the working copy.',
  );
  requireFile(
    '03-mcp/transaction-mcp/reset.mjs',
    core,
    'Create 03-mcp/transaction-mcp/reset.mjs for npm run reset:mcp.',
  );
  requireFile(
    '03-mcp/hook-demo.mjs',
    core,
    'Create 03-mcp/hook-demo.mjs for npm run hook:demo.',
  );
  requireFile(
    '03-mcp/resolve.mjs',
    stretch,
    'Create 03-mcp/resolve.mjs for the resolve workflow.',
  );
  requireFile('03-mcp/ask-human.mjs', stretch);
  requireFile(
    '03-mcp/claude-project/.claude/commands/resolve-ticket.md',
    stretch,
    'Create .claude/commands/resolve-ticket.md with the interactive workflow.',
  );
  requireFile(
    '03-mcp/transaction-mcp/drafts-server.js',
    stretch,
    'Create 03-mcp/transaction-mcp/drafts-server.js.',
  );

  const packageJson = readJson('package.json', core, 'Add package.json with the assignment scripts.');
  const scripts = packageJson?.scripts ?? {};
  for (const script of ['reset:mcp', 'hook:demo', 'check:assignment']) {
    if (!scripts[script]) core.push(`Add the npm script ${script}.`);
  }
  if (!scripts.resolve) stretch.push('Add the npm script resolve.');

  const server = read('03-mcp/transaction-mcp/server.js') ?? '';
  if (!server) {
    core.push('Create 03-mcp/transaction-mcp/server.js with transaction write tools.');
  } else {
    for (const name of ['add_transaction', 'update_transaction', 'delete_transaction']) {
      if (!new RegExp(`['"]${name}['"]`).test(server)) {
        core.push(`Register ${name} in 03-mcp/transaction-mcp/server.js.`);
      }
    }
  }

  const mcpConfig = readJson(
    '03-mcp/claude-project/.mcp.json',
    core,
    'Add transaction write settings to 03-mcp/claude-project/.mcp.json.',
  );
  const servers = mcpConfig?.mcpServers ?? {};
  const transactionEnv = servers.transactions?.env ?? {};
  if (transactionEnv.TRANSACTIONS_WRITES_ENABLED !== '1') {
    core.push('Enable transaction writes in 03-mcp/claude-project/.mcp.json.');
  }
  if (!servers.drafts) {
    stretch.push('Add the drafts MCP server to 03-mcp/claude-project/.mcp.json.');
  }
}

function checkStretchAgentFiles(options) {
  const fraudPath = '03-mcp/claude-project/.claude/agents/fraud-check-agent.md';
  const fraudText = read(fraudPath);
  if (!fraudText) {
    stretch.push(`Create ${fraudPath} with read tools.`);
  } else {
    if (!hasAgentName(fraudText, 'fraud-check-agent')) {
      stretch.push('Set the fraud-check-agent name in its frontmatter.');
    }
    if (JSON.stringify(readAgentTools(fraudText)) !== JSON.stringify([...fraudCheckAgentTools].sort())) {
      stretch.push(`Set fraud-check-agent tools to exactly: ${fraudCheckAgentTools.join(', ')}.`);
    }
  }

  const replyPath = '03-mcp/claude-project/.claude/agents/customer-reply-agent.md';
  const replyText = read(replyPath);
  if (!replyText) {
    stretch.push(`Create ${replyPath} with only ${draftTool}.`);
  } else {
    if (!hasAgentName(replyText, 'customer-reply-agent')) {
      stretch.push('Set the customer-reply-agent name in its frontmatter.');
    }
    if (JSON.stringify(readAgentTools(replyText)) !== JSON.stringify([draftTool])) {
      stretch.push(`Set customer-reply-agent tools to exactly: ${draftTool}.`);
    }
  }

  const draftUsers = new Set();
  const questionUsers = new Set();
  for (const { name, text } of agentFiles()) {
    const tools = readAgentTools(text);
    if (name !== 'customer-reply-agent' && tools.includes(draftTool)) draftUsers.add(name);
    if (tools.includes(questionTool)) questionUsers.add(name);
  }
  for (const [name, agent] of Object.entries(options?.agents ?? {})) {
    if (name !== 'customer-reply-agent' && agent.tools?.includes(draftTool)) draftUsers.add(name);
    if (agent.tools?.includes(questionTool)) questionUsers.add(name);
  }
  for (const name of draftUsers) {
    stretch.push(`Remove ${draftTool} from ${name}.`);
  }
  for (const name of questionUsers) {
    stretch.push(`Remove ${questionTool} from ${name}.`);
  }

  if (!options) {
    stretch.push('Add fraud-check-agent and customer-reply-agent to the SDK agents.');
    stretch.push(`Give customer-reply-agent only ${draftTool} in the SDK agents.`);
    stretch.push('Keep AskUserQuestion in orchestrator tools, but out of allowedTools.');
    stretch.push('Add the SDK handler for AskUserQuestion.');
    return;
  }

  const fraudAgent = options.agents?.['fraud-check-agent'];
  if (!fraudAgent) {
    stretch.push('Add fraud-check-agent to the SDK agents.');
  } else if (
    JSON.stringify([...(fraudAgent.tools ?? [])].sort())
    !== JSON.stringify([...fraudCheckAgentTools].sort())
  ) {
    stretch.push(`Give SDK fraud-check-agent only: ${fraudCheckAgentTools.join(', ')}.`);
  }

  const replyAgent = options.agents?.['customer-reply-agent'];
  if (!replyAgent) {
    stretch.push(`Add customer-reply-agent to the SDK agents with only ${draftTool}.`);
  } else if (JSON.stringify([...(replyAgent.tools ?? [])].sort()) !== JSON.stringify([draftTool])) {
    stretch.push(`Give SDK customer-reply-agent only ${draftTool}.`);
  }

  if (JSON.stringify([...(replyAgent?.tools ?? [])].filter((tool) => tool.startsWith('mcp__transactions__'))) !== '[]') {
    stretch.push('Remove transaction tools from customer-reply-agent.');
  }

  if (!options.tools?.includes(questionTool) || options.allowedTools?.includes(questionTool)) {
    stretch.push('Put AskUserQuestion in SDK tools. Keep it out of allowedTools.');
  }
  if (typeof options.canUseTool !== 'function') {
    stretch.push('Add the SDK handler for AskUserQuestion.');
  }
}

function checkResolveOptions(options, step3Options, claudeCodeOptions) {
  if (options?.mcpServers?.drafts === undefined || step3Options?.mcpServers?.drafts !== undefined) {
    stretch.push('Add drafts to assignment options only. Keep Step 3 options unchanged.');
  }
  if (!step3Options) {
    stretch.push('Keep AskUserQuestion and drafts out of Step 3 options.');
  } else if (step3Options.tools?.includes(questionTool) || step3Options.allowedTools?.includes(questionTool)) {
    stretch.push('Keep AskUserQuestion out of Step 3 tools.');
  }
  if (!claudeCodeOptions) {
    stretch.push('Keep AskUserQuestion out of the claude -p tool list.');
  } else if (
    claudeCodeOptions.allowedTools?.includes(questionTool)
    || claudeCodeOptions.tools?.includes(questionTool)
  ) {
    stretch.push('Keep AskUserQuestion out of the claude -p tool list.');
  }

  const command = read('03-mcp/claude-project/.claude/commands/resolve-ticket.md') ?? '';
  if (!command.includes('--allowedTools AskUserQuestion')) {
    stretch.push('Add AskUserQuestion to the interactive Claude Code command.');
  }
}

async function checkHookDecisions() {
  const guardPath = path.join(root, '03-mcp/hooks/transaction-guard.mjs');
  if (!existsSync(guardPath)) {
    core.push('Create 03-mcp/hooks/transaction-guard.mjs with conditional write decisions.');
    return;
  }
  let hook;
  try {
    hook = await import(pathToFileURL(guardPath).href);
  } catch {
    core.push('Fix 03-mcp/hooks/transaction-guard.mjs so the checker can load it.');
    return;
  }
  const { DENIAL_REASON, evaluatePreToolUse, askPerson, createSdkHooks } = hook;
  if (DENIAL_REASON !== denialReason) {
    core.push('Use the required no-retry reason for hook denials.');
  }
  if (typeof evaluatePreToolUse !== 'function') {
    core.push('Export evaluatePreToolUse() from 03-mcp/hooks/transaction-guard.mjs.');
    return;
  }
  const lookupTransaction = async (transactionId) => ({
    'TX-1002': { transactionId: 'TX-1002', amount: 49.99, status: 'PENDING' },
    'TX-1007': { transactionId: 'TX-1007', amount: 899, status: 'FAILED' },
  })[transactionId] ?? null;
  const cases = [
    ['transaction reads', { tool_name: 'mcp__transactions__get_transaction', tool_input: { transaction_id: 'TX-1007' } }, 'allow'],
    ['transaction lists', { tool_name: 'mcp__transactions__list_transactions' }, 'allow'],
    ['small updates', { tool_name: 'mcp__transactions__update_transaction', tool_input: { transaction_id: 'TX-1002' } }, 'allow'],
    ['large updates', { tool_name: 'mcp__transactions__update_transaction', tool_input: { transaction_id: 'TX-1007' } }, 'ask'],
    ['transaction adds', { tool_name: 'mcp__transactions__add_transaction', tool_input: { customer: 'Check BV', amount: 10 } }, 'ask'],
    ['transaction deletes', { tool_name: 'mcp__transactions__delete_transaction', tool_input: { transaction_id: 'TX-1007' } }, 'ask'],
  ];
  for (const [label, input, expected] of cases) {
    const result = await evaluatePreToolUse(input, { lookupTransaction });
    if (result.action !== expected) {
      core.push(`${label} should produce "${expected}", got "${result.action}".`);
    }
  }

  if (typeof createSdkHooks !== 'function' || typeof askPerson !== 'function') {
    core.push('Deny a gated write when no TTY can answer.');
  } else {
    const preToolUse = createSdkHooks({
      lookupTransaction,
      prompt: (input, transaction) => askPerson(input, transaction, {
        inputStream: { isTTY: false },
        outputStream: { isTTY: false },
      }),
    }).PreToolUse?.[0]?.hooks?.[0];
    if (!preToolUse) {
      core.push('Register the SDK PreToolUse callback for no-TTY writes.');
    } else {
      const result = await preToolUse({
        tool_name: 'mcp__transactions__update_transaction',
        tool_input: { transaction_id: 'TX-1007' },
      });
      if (result?.hookSpecificOutput?.permissionDecision !== 'deny') {
        core.push('Deny a gated write when no TTY can answer.');
      }
    }
  }

  const draft = await evaluatePreToolUse({
    tool_name: draftTool,
    tool_input: { message_id: 'MSG-07' },
  }, { lookupTransaction });
  if (draft.action !== 'allow') {
    stretch.push(`The hook should allow ${draftTool}, but it returned "${draft.action}".`);
  }
}

function report() {
  if (core.length > 0) {
    console.log(`Core · Parts 1–2: ${core.length} to fix.`);
    for (const issue of core) console.log(`- ${issue}`);
    if (stretch.length > 0) {
      console.log(`Stretch · Parts 3–4: ${stretch.length} open. These are optional.`);
      for (const issue of stretch) console.log(`- ${issue}`);
    } else {
      console.log('Stretch · Parts 3–4: passed.');
    }
    console.log('Assignment check failed. Fix the core items first.');
    process.exitCode = 1;
    return;
  }

  console.log('Core · Parts 1–2: passed.');
  if (stretch.length > 0) {
    console.log(`Stretch · Parts 3–4: ${stretch.length} open. These are optional.`);
    for (const issue of stretch) console.log(`- ${issue}`);
    if (strict) {
      console.log('Stretch is required with --strict.');
      process.exitCode = 1;
    } else {
      console.log('Core passed. Do the stretch parts if you have time.');
    }
    return;
  }

  console.log('Stretch · Parts 3–4: passed.');
  console.log('Assignment check passed. The agent tools, hooks, and questions meet the rules.');
}

checkTransactionAgentFile();
const { options, step3Options, claudeCodeOptions } = await loadOptions();
checkCoreSdkOptions(options);
checkClaudeCode(options);
checkClaudeRules();
checkFilesAndScripts();
checkStretchAgentFiles(options);
checkResolveOptions(options, step3Options, claudeCodeOptions);
await checkHookDecisions();
report();
