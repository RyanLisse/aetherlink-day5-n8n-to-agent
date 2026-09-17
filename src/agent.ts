/**
 * agent.ts — LESSON 3c · v3: the four fundamentals on the Claude Agent SDK
 * ---------------------------------------------------------------------------
 *
 *   ┌────────────────────────── n8n AI Agent node ──────────────────────────┐
 *   │ System Message │ Prompt │ ai_tool ×2  │ ai_memory   │ ai_languageModel │
 *   └───────┬────────┴───┬────┴──────┬──────┴──────┬──────┴────────┬─────────┘
 *           ▼            ▼           ▼             ▼               ▼
 *   options.systemPrompt prompt  options.agents  <memory> in    options.model
 *     (prompts.ts)   (prompts.ts) + tools:[Agent] prompt +      (runtime.ts)
 *                                  (tools.ts)    appendRun
 *                                                (memory.ts)
 *
 * `query()` IS the agent loop (the same one Claude Code runs): the model
 * calls the Agent tool, the SDK runs the subagent, feeds the result back,
 * and repeats until the model returns the structured decision.
 * After the loop: validate → route (router.ts) = n8n Code + Switch.
 */
import { DECISION_SCHEMA, fail, ok, type Result, type RoutedDraft, type Ticket } from "./contract.js";
import { appendRun, loadMemory, renderMemory, type MemoryStore } from "./memory.js";
import { COORDINATOR_SYSTEM, buildTriagePrompt } from "./prompts.js";
import { parseJson, routeDecision, validateDecision } from "./router.js";
import type { AgentEvent, ContentBlock, QueryFn } from "./runtime.js";
import {
  AGENT_TOOL_NAMES,
  COORDINATOR_TOOLS,
  SDK_INTERNAL_TOOLS,
  SPECIALISTS,
  createSpecialistAgents,
  type SpecialistName,
} from "./tools.js";

export interface AgentDeps {
  readonly query: QueryFn;
  readonly model: string | undefined;
  readonly modelLabel: string;
  readonly memory: MemoryStore;
  /** Injected clock → deterministic tests. */
  readonly now?: () => Date;
  /** Set false for a dry run that must not touch memory files. */
  readonly writeMemory?: boolean;
  /** Called for every streamed message — the CLI prints progress like the SDK quickstart. */
  readonly onMessage?: (message: AgentEvent) => void;
  /** Loop budget: how many turns the coordinator may take before it must answer. */
  readonly maxTurns?: number;
  /** Optional cost budget in USD; the SDK stops with `error_max_budget_usd`. */
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
  /** Turns the loop actually used (from the SDK result message). */
  readonly turns?: number;
  readonly maxTurns: number;
  readonly result: Result<RoutedDraft>;
  readonly memoryFile?: string;
}

/**
 * THE LOOP BUDGET (n8n: AI Agent → Options → "Max Iterations").
 * One turn = one model round-trip: the model answers or asks for tools, the
 * SDK runs them and feeds the results back. With two subagents plus the
 * structured answer this run needs a few turns; 8 leaves slack. Too low and
 * the SDK stops with `error_max_turns` — before any answer exists.
 */
export const DEFAULT_MAX_TURNS = 8;

/** Human-readable reason for a run that ended without an answer. Pure. */
export const describeStop = (subtype: string, turns: number | undefined, maxTurns: number): string =>
  subtype === "error_max_turns"
    ? `stopped after ${turns ?? "?"} turn(s): maxTurns (${maxTurns}) reached before an answer — raise --max-turns or simplify the task`
    : subtype === "error_max_budget_usd"
      ? "stopped: maxBudgetUsd reached before an answer"
      : `agent run did not succeed: ${subtype}`;

// ── Trace: which subagents were called, and what did they return? (pure) ──
const blocks = (content: string | readonly ContentBlock[]): readonly ContentBlock[] =>
  typeof content === "string" ? [] : content;

const textOf = (content: unknown): string =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content
          .flatMap((c: ContentBlock) => (c.type === "text" && c.text ? [c.text] : []))
          .join("\n")
      : "";

/** Agent tool results end with an `agentId: … <usage>` trailer; keep the report only. */
const stripTrailer = (text: string): string => text.replace(/\n*agentId:[\s\S]*$/, "").trim();

export const extractTrace = (events: readonly AgentEvent[]): ToolTraceEntry[] => {
  const top = events.filter(
    (e): e is Extract<AgentEvent, { type: "assistant" | "user" }> =>
      (e.type === "assistant" || e.type === "user") && e.parent_tool_use_id === null,
  );
  const calls = new Map(
    top
      .flatMap((e) => (e.type === "assistant" ? blocks(e.message.content) : []))
      .filter((b) => b.type === "tool_use" && b.id !== undefined && !SDK_INTERNAL_TOOLS.has(b.name ?? ""))
      .map((b) => {
        const input = (b.input ?? {}) as { subagent_type?: string };
        const tool =
          b.name !== undefined && AGENT_TOOL_NAMES.has(b.name)
            ? (input.subagent_type ?? "(agent)")
            : (b.name ?? "(unknown)");
        return [b.id as string, tool] as const;
      }),
  );
  return top
    .flatMap((e) => (e.type === "user" ? blocks(e.message.content) : []))
    .filter((b) => b.type === "tool_result" && b.tool_use_id !== undefined && calls.has(b.tool_use_id))
    .map((b) => ({
      tool: calls.get(b.tool_use_id as string) as string,
      output: stripTrailer(textOf(b.content)),
    }));
};

/** Every specialist must appear exactly once in the trace. Pure. */
export const checkTrace = (trace: readonly ToolTraceEntry[]): string[] => [
  ...SPECIALISTS.flatMap((name) => {
    const count = trace.filter((t) => t.tool === name).length;
    return count === 1 ? [] : [`specialist "${name}" called ${count}× (expected exactly 1)`];
  }),
  ...trace
    .filter((t) => !(SPECIALISTS as readonly string[]).includes(t.tool))
    .map((t) => `unexpected tool call: ${t.tool}`),
];

const outputOf = (trace: readonly ToolTraceEntry[], name: SpecialistName): string =>
  trace.find((t) => t.tool === name)?.output ?? "OPEN";

/** Agentic loop: stream every message, keep them for the trace. */
const collect = async (
  stream: AsyncIterable<AgentEvent>,
  onMessage: (message: AgentEvent) => void = () => undefined,
): Promise<AgentEvent[]> => {
  const events: AgentEvent[] = [];
  for await (const message of stream) {
    events.push(message);
    onMessage(message);
  }
  return events;
};

export const runTriage = async (ticket: Ticket, deps: AgentDeps): Promise<AgentRun> => {
  const now = deps.now ?? (() => new Date());
  const maxTurns = deps.maxTurns ?? DEFAULT_MAX_TURNS;

  // Fundamental #4 · MEMORY (read)
  const memory = await loadMemory(deps.memory, ticket.ticket_id);

  // Fundamentals #1 system · #2 prompt · #3 tools → the Claude Agent SDK loop
  const events = await collect(
    deps.query({
      prompt: `${buildTriagePrompt(ticket)}\n\n${renderMemory(memory)}`,
      options: {
        systemPrompt: COORDINATOR_SYSTEM,
        tools: [...COORDINATOR_TOOLS],
        allowedTools: [...COORDINATOR_TOOLS],
        agents: createSpecialistAgents(),
        outputFormat: { type: "json_schema", schema: DECISION_SCHEMA },
        permissionMode: "dontAsk", // anything not allowed above is denied
        settingSources: [], // reproducible: ignore local Claude Code settings
        maxTurns, // ← the loop budget
        ...(deps.maxBudgetUsd ? { maxBudgetUsd: deps.maxBudgetUsd } : {}),
        ...(deps.model ? { model: deps.model } : {}),
      },
    }),
    deps.onMessage,
  );

  const final = events.find((e) => e.type === "result");
  const trace = extractTrace(events);
  const rawText =
    final?.type === "result"
      ? final.structured_output !== undefined
        ? JSON.stringify(final.structured_output)
        : (final.result ?? "")
      : "";
  const base = {
    model: deps.modelLabel,
    trace,
    rawText,
    maxTurns,
    ...(final?.type === "result" && final.num_turns !== undefined ? { turns: final.num_turns } : {}),
    ...(final?.type === "result" && final.total_cost_usd !== undefined
      ? { costUsd: final.total_cost_usd }
      : {}),
  } as const;

  if (final?.type !== "result" || final.subtype !== "success") {
    return {
      ...base,
      result: fail([describeStop(final?.type === "result" ? final.subtype : "no result", base.turns, maxTurns)]),
    };
  }

  // Human-review rule: no specialist evidence → no decision.
  const traceErrors = checkTrace(trace);
  if (traceErrors.length > 0) return { ...base, result: fail(traceErrors) };

  // n8n "Code in JavaScript"
  const json = parseJson(rawText);
  if (!json.ok) return { ...base, result: json };

  // Preservation by construction: specialist outputs come from the trace,
  // not from the model's retyping.
  const merged =
    typeof json.value === "object" && json.value !== null
      ? {
          ...(json.value as Record<string, unknown>),
          customer_reply: outputOf(trace, "customer-reply"),
          risk_note: outputOf(trace, "risk"),
        }
      : json.value;

  const decision = validateDecision(ticket, merged);
  if (!decision.ok) return { ...base, result: decision };

  // n8n "Switch" + action Set nodes
  const draft = routeDecision(decision.value);

  // Fundamental #4 · MEMORY (write) — only after the contract passed.
  const memoryFile =
    deps.writeMemory === false
      ? undefined
      : await appendRun(deps.memory, draft, { at: now().toISOString(), model: deps.modelLabel });

  return { ...base, result: ok(draft), ...(memoryFile ? { memoryFile } : {}) };
};
