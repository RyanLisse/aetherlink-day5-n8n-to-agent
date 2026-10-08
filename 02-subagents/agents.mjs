import { loadAgent } from '../lib/agents.mjs';

// n8n: the Risk Agent and Customer Reply Agent tool nodes. SDK: options.agents.
// The prompts live in .claude/agents/ticket-analyst.md and .claude/agents/email-responder.md.
export const agents = {
  'ticket-analyst': loadAgent('ticket-analyst'),
  'email-responder': loadAgent('email-responder'),
};
