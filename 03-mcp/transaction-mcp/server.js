import readXlsxFile from 'read-excel-file/node';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { defaultWorkbookPath } from './paths.mjs';
import { findTransaction, listTransactions, rowsToTransactions, STATUSES } from './transactions.mjs';

const workbookPath = process.env.TRANSACTIONS_XLSX ?? defaultWorkbookPath;
const server = new McpServer({ name: 'transactions', version: '1.1.0' });

const transactionId = z.string().regex(/^TX-\d{4}$/);
const status = z.enum(STATUSES);
const fraudFlag = z.enum(['Yes', 'No']);
const readOnly = { readOnlyHint: true, openWorldHint: false };

const readWorkbook = async () => {
  const sheets = await readXlsxFile(workbookPath);
  return rowsToTransactions(Array.isArray(sheets) && sheets[0]?.data ? sheets[0].data : sheets);
};
const ok = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
const fail = (text) => ({ isError: true, content: [{ type: 'text', text }] });
const notFound = (id) => fail(`No transaction ${id} in the data`);

server.registerTool('list_transactions', {
  description: 'List transactions, optionally filtered by status, customer name or fraud flag.',
  inputSchema: {
    status: status.optional(),
    customer: z.string().min(1).optional(),
    fraud_flag: fraudFlag.optional(),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { title: 'List transactions', ...readOnly },
}, async ({ status: wanted, customer, fraud_flag, limit }) => (
  ok(listTransactions(await readWorkbook(), { status: wanted, customer, fraudFlag: fraud_flag, limit }))
));

server.registerTool('get_transaction', {
  description: 'Look up one transaction by its transaction ID.',
  inputSchema: { transaction_id: transactionId },
  annotations: { title: 'Get transaction', ...readOnly },
}, async ({ transaction_id }) => {
  const transaction = findTransaction(await readWorkbook(), transaction_id);
  return transaction ? ok(transaction) : notFound(transaction_id);
});

await server.connect(new StdioServerTransport());
