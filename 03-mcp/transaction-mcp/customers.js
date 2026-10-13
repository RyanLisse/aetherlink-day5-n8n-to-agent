import { readFile } from 'node:fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { defaultCustomerContextPath } from './paths.mjs';

const csvPath = process.env.CUSTOMER_CONTEXT_CSV ?? defaultCustomerContextPath;
const server = new McpServer({ name: 'customers', version: '1.0.0' });
const customerId = z.string().regex(/^CUST-\d{3}$/);
const readOnly = { readOnlyHint: true, openWorldHint: false };
const ok = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
const numberOrNull = (value) => value === '' ? null : Number(value);
const notFound = (id) => ({
  isError: true,
  content: [{ type: 'text', text: `No customer ${id} in the data` }],
});

async function findCustomer(id) {
  const [headerLine, ...rows] = (await readFile(csvPath, 'utf8')).trim().split(/\r?\n/);
  const headers = headerLine.split(',');

  for (const row of rows) {
    const values = row.split(',');
    const customer = Object.fromEntries(headers.map((header, index) => [header, values[index]]));

    if (customer.customer_id === id) {
      return {
        customer_id: customer.customer_id,
        customer_name: customer.customer_name,
        customer_type: customer.customer_type,
        transactions_per_hour: numberOrNull(customer.transactions_per_hour),
        previous_incidents: numberOrNull(customer.previous_incidents),
        critical: customer.critical === '' ? null : customer.critical.toLowerCase() === 'true',
      };
    }
  }

  return null;
}

server.registerTool('get_customer', {
  description: 'Look up the customer context for one customer ID.',
  inputSchema: { customer_id: customerId },
  annotations: { title: 'Get customer', ...readOnly },
}, async ({ customer_id }) => {
  const customer = await findCustomer(customer_id);
  return customer ? ok(customer) : notFound(customer_id);
});

await server.connect(new StdioServerTransport());
