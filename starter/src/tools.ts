/** STARTER · Step 3b — fundamental #3: tools = two specialist subagents (Claude Agent SDK). */
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { CUSTOMER_REPLY_SYSTEM, RISK_SYSTEM } from "./prompts.js";

export const SPECIALISTS = ["customer-reply", "risk"] as const;
export type SpecialistName = (typeof SPECIALISTS)[number];

/** The coordinator's only built-in tool: it starts subagents. */
export const COORDINATOR_TOOLS = ["Agent"] as const;
export const AGENT_TOOL_NAMES: ReadonlySet<string> = new Set(["Agent", "Task"]);
/** The SDK adds this tool itself to deliver outputFormat — not a specialist call. */
export const SDK_INTERNAL_TOOLS: ReadonlySet<string> = new Set(["StructuredOutput"]);

// n8n: each "AI Agent Tool" node had a description, a system message and a model.
// TODO: fill description (WHEN to call it), keep tools: [] (it can only write text),
//       background: false (the coordinator waits for the answer).
/** Each subagent has its own loop budget. TODO: add `maxTurns: SPECIALIST_MAX_TURNS` below. */
export const SPECIALIST_MAX_TURNS = 2;

export const createSpecialistAgents = (
  model = "inherit",
): Readonly<Record<SpecialistName, AgentDefinition>> => ({
  "customer-reply": { description: "TODO", prompt: CUSTOMER_REPLY_SYSTEM, tools: [], model },
  risk: { description: "TODO", prompt: RISK_SYSTEM, tools: [], model },
});
