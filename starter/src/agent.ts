/**
 * STARTER · agent.ts — LESSON 3a · v1: your first agent on the Claude Agent SDK
 * ---------------------------------------------------------------------------
 *
 *   ┌──────────── n8n AI Agent node ────────────┐
 *   │ System Message │ Prompt │ ai_languageModel │   (no tools, no memory yet)
 *   └───────┬────────┴───┬────┴────────┬─────────┘
 *           ▼            ▼             ▼
 *   options.systemPrompt prompt   options.model
 *
 * Same shape as the SDK quickstart: `query()` returns an async iterator and
 * the `for await` loop streams every message while Claude works. No tools at
 * all (`tools: []`). The result goes through the Lesson 2 router, so the
 * contract is enforced from the first run. Without specialists,
 * customer_reply / risk_note can only be "OPEN". → next: Lesson 3b
 */
import { DECISION_SCHEMA, fail, type Result, type RoutedDraft, type Ticket } from "./contract.js";
import { COORDINATOR_SYSTEM, buildTriagePrompt } from "./prompts.js";
import { checkAndRoute } from "./router.js";
void DECISION_SCHEMA; void COORDINATOR_SYSTEM; void buildTriagePrompt; void checkAndRoute;
import type { AgentEvent, QueryFn } from "./runtime.js";

export interface AgentDeps {
  /** The SDK's `query` (or the offline fake) — see src/runtime.ts. */
  readonly query: QueryFn;
  readonly model: string | undefined;
  readonly modelLabel: string;
  /** Called for every streamed message — the CLI prints progress. */
  readonly onMessage?: (message: AgentEvent) => void;
}

export interface ToolTraceEntry {
  readonly tool: string;
  readonly output: string;
}

export interface AgentRun {
  readonly model: string;
  readonly trace: readonly ToolTraceEntry[];
  readonly rawText: string;
  readonly costUsd?: number;
  readonly result: Result<RoutedDraft>;
  readonly memoryFile?: string;
}

export const runTriage = async (ticket: Ticket, deps: AgentDeps): Promise<AgentRun> => {
  // TODO: Agentic loop — for await (const message of deps.query({ prompt, options })) { … }
  //   prompt:  buildTriagePrompt(ticket)
  //   options: systemPrompt, tools: [], outputFormat json_schema (DECISION_SCHEMA),
  //            permissionMode "dontAsk", settingSources [], maxTurns 3, model
  //   deps.onMessage?.(message); keep the { type: "result" } message.
  // TODO: JSON.stringify(result.structured_output) → checkAndRoute(ticket, text)
  return { model: deps.modelLabel, trace: [], rawText: "", result: fail([`TODO: run ${ticket.ticket_id}`]) };
};
