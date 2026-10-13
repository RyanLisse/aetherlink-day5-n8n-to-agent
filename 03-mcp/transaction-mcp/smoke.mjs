import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { defaultCustomerContextPath, defaultWorkbookPath } from './paths.mjs';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const transactionId = process.argv[2] ?? 'TX-1014';
const workbookHash = () => createHash('sha256').update(readFileSync(defaultWorkbookPath)).digest('hex');
const hashBefore = workbookHash();
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(serverDirectory, 'server.js')],
  env: { ...process.env, TRANSACTIONS_XLSX: defaultWorkbookPath },
});
const client = new Client({ name: 'transaction-smoke', version: '1.1.0' });
const customerTransport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(serverDirectory, 'customers.js')],
  env: { ...process.env, CUSTOMER_CONTEXT_CSV: defaultCustomerContextPath },
});
const customerClient = new Client({ name: 'customer-smoke', version: '1.0.0' });

const expect = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const call = async (name, args) => {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content.map((block) => block.text ?? '').join('\n');
  return { isError: Boolean(result.isError), text, value: result.isError ? null : JSON.parse(text) };
};

await client.connect(transport);

try {
  const { tools } = await client.listTools();
  console.log('Transaction tools:');
  for (const tool of tools) {
    console.log(`  ${tool.name} — read-only`);
    expect(tool.annotations?.readOnlyHint === true, `${tool.name} must be marked read-only.`);
  }
  expect(
    tools.map(({ name }) => name).sort().join() === 'get_transaction,list_transactions',
    'The transaction server must expose only get_transaction and list_transactions.',
  );

  const lookup = await call('get_transaction', { transaction_id: transactionId });
  expect(!lookup.isError, lookup.text);
  console.log(`get_transaction ${transactionId}:`);
  console.log(JSON.stringify(lookup.value, null, 2));

  const list = await call('list_transactions', {});
  expect(!list.isError && list.value.count > 0, list.text);
  expect(
    list.value.transactions.some(({ transactionId: id }) => id === transactionId),
    `${transactionId} should appear in list_transactions.`,
  );
  console.log(`list_transactions: ${list.value.count} transactions`);

  expect(workbookHash() === hashBefore, 'transactions.xlsx changed; the workbook must stay read-only.');

  await customerClient.connect(customerTransport);
  try {
    const { tools: customerTools } = await customerClient.listTools();
    expect(
      customerTools.map(({ name }) => name).join() === 'get_customer',
      'The customer server must expose get_customer.',
    );
    expect(customerTools[0].annotations?.readOnlyHint === true, 'get_customer must be marked read-only.');

    const customer = await customerClient.callTool({ name: 'get_customer', arguments: { customer_id: 'CUST-003' } });
    const customerValue = JSON.parse(customer.content[0].text);
    expect(customerValue.customer_name === 'GlobalPay Commerce', 'CUST-003 should resolve to GlobalPay Commerce.');
    expect(customerValue.critical === true, 'CUST-003 should be marked critical.');
    console.log(`get_customer CUST-003: ${JSON.stringify(customerValue)}`);

    for (const [customerId, customerName] of [['CUST-007', 'Vertex Commerce'], ['CUST-008', 'Futura Labs']]) {
      const result = await customerClient.callTool({ name: 'get_customer', arguments: { customer_id: customerId } });
      const value = JSON.parse(result.content[0].text);
      expect(value.customer_name === customerName, `${customerId} should resolve to ${customerName}.`);
      expect(value.customer_type === 'Unknown', `${customerId} should have an unknown context type.`);
      expect(
        value.transactions_per_hour === null && value.previous_incidents === null && value.critical === null,
        `${customerId} should not claim unverified customer metrics.`,
      );
      console.log(`get_customer ${customerId}: ${JSON.stringify(value)}`);
    }

    const missingCustomer = await customerClient.callTool({ name: 'get_customer', arguments: { customer_id: 'CUST-999' } });
    expect(
      missingCustomer.isError && missingCustomer.content[0].text.includes('No customer CUST-999'),
      'CUST-999 should be reported not found.',
    );
    console.log(`get_customer CUST-999: ${missingCustomer.content[0].text}`);
  } finally {
    await customerClient.close();
  }

  expect(workbookHash() === hashBefore, 'transactions.xlsx changed; the workbook must stay read-only.');
  console.log('MCP servers OK — read-only lookups; no model was called.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
