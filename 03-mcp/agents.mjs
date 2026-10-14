import { loadAgent } from '../lib/agents.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Least privilege: each subagent gets only the tools it needs.
export const agents = {
  'risk-agent': loadAgent('risk-agent', ['mcp__transactions__get_transaction']),
  'customer-reply-agent': loadAgent('customer-reply-agent'),
  'customer-context-agent': loadAgent('customer-context-agent', ['mcp__customers__get_customer']),
};

const lessonDirectory = path.dirname(fileURLToPath(import.meta.url));
export const assignmentAgents = {
  ...agents,
  'customer-reply-agent': loadAgent('customer-reply-agent', [
    'mcp__drafts__save_reply_draft',
  ], path.join(lessonDirectory, 'claude-project', '.claude', 'agents', 'customer-reply-agent.md')),
  'fraud-check-agent': loadAgent('fraud-check-agent', [
    'mcp__transactions__get_transaction',
    'mcp__transactions__list_transactions',
    'mcp__customers__get_customer',
  ], path.join(lessonDirectory, 'claude-project', '.claude', 'agents', 'fraud-check-agent.md')),
  'transaction-agent': loadAgent('transaction-agent', [
    'mcp__transactions__get_transaction',
    'mcp__transactions__update_transaction',
    'mcp__transactions__add_transaction',
  ], path.join(lessonDirectory, 'claude-project', '.claude', 'agents', 'transaction-agent.md')),
};
