import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { agents } from './agents.mjs';
import { askPerson } from './approval.mjs';
import { defaultStorePath, defaultWorkbookPath } from './transaction-mcp/paths.mjs';

const lessonDirectory = path.dirname(fileURLToPath(import.meta.url));
const transactionServer = path.join(lessonDirectory, 'transaction-mcp', 'server.js');
const workbook = defaultWorkbookPath;
const workingCopy = defaultStorePath;

export function buildOptions() {
  return {
    cwd: path.join(lessonDirectory, 'claude-project'),
    settingSources: ['project'],
    systemPrompt: { type: 'preset', preset: 'claude_code' },
    agents,
    tools: ['Agent', 'Write'],
    allowedTools: ['Agent', 'Write', 'mcp__transactions__get_transaction', 'mcp__transactions__list_transactions'],
    canUseTool: askPerson,
    disallowedTools: ['WebSearch', 'WebFetch', 'Bash'],
    permissionMode: 'acceptEdits',
    maxTurns: 10,
    mcpServers: {
      transactions: {
        type: 'stdio',
        command: 'node',
        args: [transactionServer],
        env: { TRANSACTIONS_XLSX: workbook, TRANSACTIONS_STORE: workingCopy },
      },
    },
  };
}
