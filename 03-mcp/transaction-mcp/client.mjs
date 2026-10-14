import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultStorePath, defaultWorkbookPath } from './paths.mjs';

const serverPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'server.js');

export async function getTransactionFromServer(transactionId) {
  const client = new Client({ name: 'transaction-guard', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: {
      ...process.env,
      TRANSACTIONS_XLSX: process.env.TRANSACTIONS_XLSX ?? defaultWorkbookPath,
      TRANSACTIONS_STORE: process.env.TRANSACTIONS_STORE ?? defaultStorePath,
      TRANSACTIONS_WRITES_ENABLED: '1',
    },
  });
  await client.connect(transport);
  try {
    const result = await client.callTool({ name: 'get_transaction', arguments: { transaction_id: transactionId } });
    if (result.isError) return null;
    return JSON.parse(result.content.find((block) => block.type === 'text')?.text ?? 'null');
  } finally {
    await client.close();
  }
}
