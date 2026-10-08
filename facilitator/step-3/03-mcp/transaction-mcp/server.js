import readXlsxFile from 'read-excel-file/node';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { defaultStorePath, defaultWorkbookPath } from './paths.mjs';
import { loadTransactions, saveTransactions } from './store.mjs';
import {
  STATUSES,
  addTransaction,
  deleteTransaction,
  findTransaction,
  listTransactions,
  rowsToTransactions,
  updateTransaction,
} from './transactions.mjs';

const workbookPath = process.env.TRANSACTIONS_XLSX ?? defaultWorkbookPath;
const storePath = process.env.TRANSACTIONS_STORE ?? defaultStorePath;
const server = new McpServer({ name: 'transactions', version: '1.1.0' });

const transactionId = z.string().regex(/^TX-\d{4}$/);
const status = z.enum(STATUSES);
const fraudFlag = z.enum(['Yes', 'No']);
const readOnly = { readOnlyHint: true, openWorldHint: false };

const readWorkbook = async () => {
  const sheets = await readXlsxFile(workbookPath);
  return rowsToTransactions(Array.isArray(sheets) && sheets[0]?.data ? sheets[0].data : sheets);
};
const load = () => loadTransactions({ storePath, readSeed: readWorkbook });
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
  ok(listTransactions(await load(), { status: wanted, customer, fraudFlag: fraud_flag, limit }))
));

server.registerTool('get_transaction', {
  description: 'Look up one transaction by its transaction ID.',
  inputSchema: { transaction_id: transactionId },
  annotations: { title: 'Get transaction', ...readOnly },
}, async ({ transaction_id }) => {
  const transaction = findTransaction(await load(), transaction_id);
  return transaction ? ok(transaction) : notFound(transaction_id);
});

server.registerTool('add_transaction', {
  description: 'Add a transaction; the server assigns the next transaction ID and returns the new record.',
  inputSchema: {
    customer: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().regex(/^[A-Z]{3}$/).default('EUR'),
    status,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    issue_details: z.string().min(1),
    fraud_flag: fraudFlag.default('No'),
  },
  annotations: {
    title: 'Add transaction', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false,
  },
}, async ({ issue_details, fraud_flag, ...values }) => {
  const result = addTransaction(await load(), { ...values, issueDetails: issue_details, fraudFlag: fraud_flag });
  saveTransactions(storePath, result.transactions);
  return ok(result.record);
});

server.registerTool('update_transaction', {
  description: 'Change the status, amount, issue details or fraud flag of one transaction; returns the record before and after.',
  inputSchema: {
    transaction_id: transactionId,
    status: status.optional(),
    amount: z.number().positive().optional(),
    issue_details: z.string().min(1).optional(),
    fraud_flag: fraudFlag.optional(),
  },
  annotations: {
    title: 'Update transaction', readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false,
  },
}, async ({ transaction_id, issue_details, fraud_flag, ...rest }) => {
  const changes = { ...rest, issueDetails: issue_details, fraudFlag: fraud_flag };

  if (Object.values(changes).every((value) => value === undefined)) {
    return fail('Give at least one field to change');
  }

  const result = updateTransaction(await load(), transaction_id, changes);

  if (!result) {
    return notFound(transaction_id);
  }

  saveTransactions(storePath, result.transactions);
  return ok({ before: result.before, after: result.after });
});

server.registerTool('delete_transaction', {
  description: 'Delete one transaction by its transaction ID; returns the deleted record.',
  inputSchema: { transaction_id: transactionId },
  annotations: {
    title: 'Delete transaction', readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false,
  },
}, async ({ transaction_id }) => {
  const result = deleteTransaction(await load(), transaction_id);

  if (!result) {
    return notFound(transaction_id);
  }

  saveTransactions(storePath, result.transactions);
  return ok(result.record);
});

await server.connect(new StdioServerTransport());
