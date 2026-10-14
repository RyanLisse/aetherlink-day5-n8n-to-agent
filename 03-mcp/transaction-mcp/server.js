import readXlsxFile from 'read-excel-file/node';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { defaultStorePath, defaultWorkbookPath } from './paths.mjs';
import {
  addTransaction, deleteTransaction, findTransaction, listTransactions, rowsToTransactions, STATUSES, updateTransaction,
} from './transactions.mjs';
import { loadTransactions, saveTransactions } from './store.mjs';

const workbookPath = process.env.TRANSACTIONS_XLSX ?? defaultWorkbookPath;
const storePath = process.env.TRANSACTIONS_STORE ?? defaultStorePath;
if (path.resolve(storePath) === path.resolve(workbookPath)) {
  throw new Error('Set TRANSACTIONS_STORE to a JSON path, not transactions.xlsx.');
}
const server = new McpServer({ name: 'transactions', version: '1.1.0' });

const transactionId = z.string().regex(/^TX-\d{4}$/);
const status = z.enum(STATUSES);
const fraudFlag = z.enum(['Yes', 'No']);
const readOnly = { readOnlyHint: true, openWorldHint: false };

const readWorkbook = async () => {
  const sheets = await readXlsxFile(workbookPath);
  return rowsToTransactions(Array.isArray(sheets) && sheets[0]?.data ? sheets[0].data : sheets);
};
const load = () => process.env.TRANSACTIONS_WRITES_ENABLED === '1'
  ? loadTransactions({ storePath, readSeed: readWorkbook })
  : readWorkbook();
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

if (process.env.TRANSACTIONS_WRITES_ENABLED === '1') {
  server.registerTool('add_transaction', {
    description: 'Add a transaction to the working copy.',
    inputSchema: {
      customer: z.string().min(1),
      amount: z.number().positive(),
      status: status.default('PENDING'),
      date: z.string().min(1),
      currency: z.string().min(1).default('EUR'),
      issue_details: z.string().min(1),
      fraud_flag: fraudFlag.default('No'),
    },
    annotations: { title: 'Add transaction', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (input) => {
    const current = await load();
    const added = addTransaction(current, {
      customer: input.customer,
      amount: input.amount,
      status: input.status,
      date: input.date,
      currency: input.currency,
      issueDetails: input.issue_details,
      fraudFlag: input.fraud_flag,
    });
    saveTransactions(storePath, added.transactions);
    return ok(added.record);
  });

  server.registerTool('update_transaction', {
    description: 'Update a transaction in the working copy.',
    inputSchema: {
      transaction_id: transactionId,
      status: status.optional(),
      amount: z.number().positive().optional(),
      issue_details: z.string().min(1).optional(),
      fraud_flag: fraudFlag.optional(),
    },
    annotations: { title: 'Update transaction', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ transaction_id, ...changes }) => {
    const current = await load();
    const result = updateTransaction(current, transaction_id, {
      status: changes.status,
      amount: changes.amount,
      issueDetails: changes.issue_details,
      fraudFlag: changes.fraud_flag,
    });
    if (!result) return notFound(transaction_id);
    saveTransactions(storePath, result.transactions);
    return ok({ before: result.before, after: result.after });
  });

  server.registerTool('delete_transaction', {
    description: 'Delete a transaction from the working copy.',
    inputSchema: { transaction_id: transactionId },
    annotations: { title: 'Delete transaction', readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  }, async ({ transaction_id }) => {
    const current = await load();
    const result = deleteTransaction(current, transaction_id);
    if (!result) return notFound(transaction_id);
    saveTransactions(storePath, result.transactions);
    return ok(result.record);
  });
}

await server.connect(new StdioServerTransport());
