/**
 * agent.ts — LESSON 3a · v1: your first agent on the Claude Agent SDK
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
 * contract is enforced from the first run. Without specialists the offline
 * fake returns "OPEN" — and a real model just writes customer_reply and
 * risk_note itself. Valid shape, no evidence of who wrote it. → Lesson 3b
 */
import { DECISION_SCHEMA, fail, type Result, type RoutedDraft, type Ticket } from "./contract.js";
import { COORDINATOR_SYSTEM, buildTriagePrompt } from "./prompts.js";
import { checkAndRoute } from "./router.js";
import type { AgentEvent, QueryFn } from "./runtime.js";

export interface AgentDeps {
  /** The SDK's `query` (or the offline fake) — see src/runtime.ts. */
  readonly query: QueryFn;
  readonly model: string | undefined;
  readonly modelLabel: string;
  /** Called for every streamed message — the CLI prints progress. */
  readonly onMessage?: (message: AgentEvent) => void;
  /** Loop budget (n8n: "Max Iterations"). */
  readonly maxTurns?: number;
  /** Optional cost budget in USD. */
  readonly maxBudgetUsd?: number;
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
  readonly turns?: number;
  readonly maxTurns: number;
  readonly result: Result<RoutedDraft>;
  readonly memoryFile?: string;
}

/**
 * THE LOOP BUDGET. One turn = one model round-trip. Without tools this agent
 * should answer almost at once, so a small budget is enough.
 */
export const DEFAULT_MAX_TURNS = 3;

export const runTriage = async (ticket: Ticket, deps: AgentDeps): Promise<AgentRun> => {
  const maxTurns = deps.maxTurns ?? DEFAULT_MAX_TURNS;
  let final: Extract<AgentEvent, { type: "result" }> | undefined;

  // Agentic loop: streams messages as Claude works
  for await (const message of deps.query({
    prompt: buildTriagePrompt(ticket), // 2 · prompt
    options: {
      systemPrompt: COORDINATOR_SYSTEM, // 1 · system message
      tools: [], // no built-in tools yet
      outputFormat: { type: "json_schema", schema: DECISION_SCHEMA },
      permissionMode: "dontAsk", // deny anything not allowed
      settingSources: [], // ignore local Claude Code settings
      maxTurns, // ← the loop budget
      ...(deps.maxBudgetUsd ? { maxBudgetUsd: deps.maxBudgetUsd } : {}),
      ...(deps.model ? { model: deps.model } : {}),
    },
  })) {
    deps.onMessage?.(message);
    if (message.type === "result") final = message;
  }

  const turns = final?.num_turns !== undefined ? { turns: final.num_turns } : {};
  if (final?.subtype !== "success") {
    const why =
      final?.subtype === "error_max_turns"
        ? `stopped: maxTurns (${maxTurns}) reached before an answer — raise --max-turns`
        : `agent run did not succeed: ${final?.subtype ?? "no result"}`;
    return { model: deps.modelLabel, trace: [], rawText: "", maxTurns, ...turns, result: fail([why]) };
  }
  const rawText =
    final.structured_output !== undefined ? JSON.stringify(final.structured_output) : (final.result ?? "");

  // n8n "Code in JavaScript" + validator + "Switch"
  return {
    model: deps.modelLabel,
    trace: [],
    rawText,
    maxTurns,
    ...turns,
    ...(final.total_cost_usd !== undefined ? { costUsd: final.total_cost_usd } : {}),
    result: checkAndRoute(ticket, rawText),
  };
};
