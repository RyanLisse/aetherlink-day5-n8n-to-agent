import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { agents } from './agents.mjs';
import { defaultWorkbookPath } from './transaction-mcp/paths.mjs';

const lessonDirectory = path.dirname(fileURLToPath(import.meta.url));
const transactionServer = path.join(lessonDirectory, 'transaction-mcp', 'server.js');
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
