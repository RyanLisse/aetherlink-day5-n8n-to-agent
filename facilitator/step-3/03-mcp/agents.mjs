import { loadAgent } from '../lib/agents.mjs';

// Least privilege: each subagent gets only the tools it needs.
export const agents = {
  'risk-agent': loadAgent('risk-agent', ['mcp__transactions__get_transaction']),
  'customer-reply-agent': loadAgent('customer-reply-agent'),
  'customer-context-agent': loadAgent('customer-context-agent', ['mcp__customers__get_customer']),
};
