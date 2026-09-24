/**
 * tools.ts — tools = specialist subagents
 * ---------------------------------------------------------------------------
 * n8n Customer Reply + Risk Agent tools → options.tools ["Agent"] + options.agents.
 */
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { CUSTOMER_REPLY_SYSTEM, RISK_SYSTEM } from "./prompts.js";

/** Subagent names are part of the contract — the trace check looks for exactly these. */
export const SPECIALISTS = ["customer-reply", "risk"] as const;
export type SpecialistName = (typeof SPECIALISTS)[number];

/** Built-in tools the COORDINATOR may use. Nothing else: no Bash, no Write, no Web. */
export const COORDINATOR_TOOLS = ["Agent"] as const;

/** Older CLI builds report the Agent tool as "Task"; both mean "call a subagent". */
export const AGENT_TOOL_NAMES: ReadonlySet<string> = new Set(["Agent", "Task"]);

/** Tools the SDK adds itself (e.g. to deliver `outputFormat`) — not specialist calls. */
export const SDK_INTERNAL_TOOLS: ReadonlySet<string> = new Set(["StructuredOutput"]);

/**
 * Each subagent has its OWN loop budget. A specialist without tools only
 * needs to write text, so a small budget keeps it from wandering.
 */
export const SPECIALIST_MAX_TURNS = 2;

export const createSpecialistAgents = (
  model = "inherit",
): Readonly<Record<SpecialistName, AgentDefinition>> => ({
  "customer-reply": {
    description:
      "Customer Reply Agent: drafts a short, friendly customer reply. Call exactly once with the full ticket.",
    prompt: CUSTOMER_REPLY_SYSTEM,
    tools: [],
    maxTurns: SPECIALIST_MAX_TURNS,
    model,
    background: false,
  },
  risk: {
    description:
      "Risk Agent: writes an internal risk_note (complaint risk, urgency, escalation, evidence to check). Call exactly once with the full ticket.",
    prompt: RISK_SYSTEM,
    tools: [],
    maxTurns: SPECIALIST_MAX_TURNS,
    model,
    background: false,
  },
});
