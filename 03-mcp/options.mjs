import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { agents, assignmentAgents } from './agents.mjs';
import { createAskHumanHandler } from './ask-human.mjs';
import { createSdkHooks } from './hooks/transaction-guard.mjs';
import { defaultAuditPath, defaultStorePath, defaultWorkbookPath } from './transaction-mcp/paths.mjs';

const lessonDirectory = path.dirname(fileURLToPath(import.meta.url));
const transactionServer = path.join(lessonDirectory, 'transaction-mcp', 'server.js');
const draftsServer = path.join(lessonDirectory, 'transaction-mcp', 'drafts-server.js');
const customerServer = path.join(lessonDirectory, 'transaction-mcp', 'customers.js');
const workbook = defaultWorkbookPath;
const customerContext = path.join(path.dirname(lessonDirectory), 'docs', 'customer_context.csv');

export function buildOptions() {
  return {
    cwd: path.join(lessonDirectory, 'claude-project'),
    settingSources: ['project'],
    systemPrompt: { type: 'preset', preset: 'claude_code' },
    agents,
    tools: ['Agent', 'Write'],
    allowedTools: [
      'Agent',
      'Write',
      'mcp__transactions__get_transaction',
      'mcp__transactions__list_transactions',
      'mcp__customers__get_customer',
    ],
    disallowedTools: ['WebSearch', 'WebFetch', 'Bash'],
    permissionMode: 'acceptEdits',
    maxTurns: 10,
    mcpServers: {
      transactions: {
        type: 'stdio',
        command: 'node',
        args: [transactionServer],
        env: { TRANSACTIONS_XLSX: workbook },
      },
      customers: {
        type: 'stdio',
        command: 'node',
        args: [customerServer],
        env: { CUSTOMER_CONTEXT_CSV: customerContext },
      },
    },
  };
}

export function buildResolveOptions({ backend = 'sdk' } = {}) {
  const options = buildOptions();
  const questionTool = backend === 'claude-code' ? [] : ['AskUserQuestion'];
  return {
    ...options,
    settingSources: backend === 'claude-code' ? ['project'] : [],
    agents: assignmentAgents,
    tools: ['Agent', ...questionTool],
    allowedTools: [
      'Agent',
      ...questionTool,
      'mcp__transactions__get_transaction',
      'mcp__transactions__list_transactions',
      'mcp__customers__get_customer',
    ],
    permissionMode: 'default',
    mcpServers: {
      ...options.mcpServers,
      drafts: {
        type: 'stdio',
        command: 'node',
        args: [draftsServer],
      },
      transactions: {
        ...options.mcpServers.transactions,
        env: {
          ...options.mcpServers.transactions.env,
          TRANSACTIONS_STORE: defaultStorePath,
          TRANSACTIONS_AUDIT: defaultAuditPath,
          TRANSACTIONS_WRITES_ENABLED: '1',
        },
      },
    },
    ...(backend === 'claude-code' ? {} : { hooks: createSdkHooks() }),
    ...(backend === 'claude-code' ? {} : { canUseTool: createAskHumanHandler() }),
  };
}
