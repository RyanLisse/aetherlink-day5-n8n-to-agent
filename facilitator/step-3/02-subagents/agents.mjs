import { loadAgent } from '../lib/agents.mjs';

// n8n: the Risk Agent and Customer Reply Agent tool nodes. SDK: options.agents.
// The prompts live in .claude/agents/risk-agent.md and .claude/agents/customer-reply-agent.md.
export const agents = {
  'risk-agent': loadAgent('risk-agent'),
  'customer-reply-agent': loadAgent('customer-reply-agent'),
};
