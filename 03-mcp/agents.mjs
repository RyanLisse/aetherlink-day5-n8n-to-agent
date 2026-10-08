import { loadAgent } from '../lib/agents.mjs';

// Least privilege: each subagent gets only the tools it needs.
// The analyst may only READ one transaction. The clerk (stretch, Step 3b) may change records, and
// every change it makes stops at the human approval gate in approval.mjs.
export const agents = {
  'ticket-analyst': loadAgent('ticket-analyst', ['mcp__transactions__get_transaction']),
  'email-responder': loadAgent('email-responder'),
  'transaction-clerk': loadAgent('transaction-clerk', [
    'mcp__transactions__list_transactions',
    'mcp__transactions__get_transaction',
    'mcp__transactions__add_transaction',
    'mcp__transactions__update_transaction',
    'mcp__transactions__delete_transaction',
  ]),
};
