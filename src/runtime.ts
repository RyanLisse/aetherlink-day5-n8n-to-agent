/**
 * runtime.ts — LESSON 3a · which "engine" runs the agent (port + adapters)
 * ---------------------------------------------------------------------------
 * n8n: "OpenAI Chat Model" sub-node (gpt-5-mini) + a credential picked in the UI.
 * Here: the Claude Agent SDK `query()` — the same agent loop that powers
 * Claude Code — behind a tiny port so the room can also run offline.
 *
 *   AGENT_MODEL=offline            → scripted fake (default · no key · no network)
 *   AGENT_MODEL=sonnet             → real Claude Agent SDK run (alias or full id,
 *   AGENT_MODEL=claude-sonnet-5      e.g. claude-sonnet-5). Needs ANTHROPIC_API_KEY
 *                                    exported in your shell (the SDK does not read .env).
 *
 * Hexagonal: the agent depends on `QueryFn` (port), not on the SDK directly.
 * The OFFLINE adapter is a teaching tool — its output is scripted and is
 * NEVER model evidence; progress.md must record which runtime actually ran.
 */
import { query, type Options } from "@anthropic-ai/claude-agent-sdk";

// ── Port: the slice of SDK messages the agent reads ──────────────────────
export interface ContentBlock {
  readonly type: string;
  readonly id?: string;
  readonly name?: string;
  readonly input?: unknown;
  readonly text?: string;
  readonly tool_use_id?: string;
  readonly content?: unknown;
}

export type AgentEvent =
  | {
      readonly type: "assistant";
      readonly parent_tool_use_id: string | null;
      readonly message: { readonly content: readonly ContentBlock[] };
    }
  | {
      readonly type: "user";
      readonly parent_tool_use_id: string | null;
      readonly message: { readonly content: string | readonly ContentBlock[] };
    }
  | {
      readonly type: "result";
      readonly subtype: string;
      readonly result?: string;
      readonly structured_output?: unknown;
      readonly total_cost_usd?: number;
      /** How many loop turns (model round-trips) the run used. */
      readonly num_turns?: number;
    }
  | { readonly type: "system" | "other"; readonly subtype?: string };

export interface QueryArgs {
  readonly prompt: string;
  readonly options: Options;
}

/** The port. Real SDK and offline fake both satisfy it. */
export type QueryFn = (args: QueryArgs) => AsyncIterable<AgentEvent>;

// ── Adapter 1: the real Claude Agent SDK ─────────────────────────────────
const KNOWN = new Set(["assistant", "user", "result", "system"]);

export const sdkQuery: QueryFn = async function* ({ prompt, options }) {
  let sawResult = false;
  try {
    for await (const message of query({ prompt, options })) {
      sawResult ||= message.type === "result";
      // SDK messages are a superset of AgentEvent; unknown kinds become "other".
      yield (KNOWN.has(message.type) ? message : { type: "other" }) as AgentEvent;
    }
  } catch (error) {
    // After an error result (e.g. error_max_turns) the SDK also throws.
    // The result message already told us why, so stop quietly.
    if (!sawResult) throw error;
  }
};

// ── Adapter 2: offline scripted fake ─────────────────────────────────────
const extractTicket = (text: string): Record<string, string> => {
  const match = /<ticket>\s*([\s\S]*?)\s*<\/ticket>/.exec(text);
  try {
    return match?.[1] ? (JSON.parse(match[1]) as Record<string, string>) : {};
  } catch {
    return {};
  }
};

/** Toy keyword heuristic — deliberately simple so the room can predict it. */
const offlinePriority = (message: string): "low" | "medium" | "high" =>
  /charged twice|complaint|fraud|today/i.test(message)
    ? "high"
    : /refund|error|wrong|broken/i.test(message)
      ? "medium"
      : "low";

const ROUTE = { low: "auto_reply", medium: "investigate", high: "escalate" } as const;

export const OFFLINE_REPLIES: Readonly<Record<string, (ticket: string) => string>> = {
  "customer-reply": () =>
    "Thank you for reporting this. A colleague will review your message and get back to you; this is a draft that has not been sent.",
  risk: (ticket) =>
    /charged twice|complaint/i.test(ticket)
      ? "Possible duplicate charge plus complaint threat and same-day deadline: escalation signal. Evidence to check: payment records for both charges (OPEN)."
      : "No complaint or payment-loss signal in the ticket. Evidence to check: the customer's request itself (OPEN).",
};

/**
 * Plays the coordinator: if subagents are configured it "calls" each one
 * once through the Agent tool, then returns structured output.
 */
export const offlineQuery: QueryFn = async function* ({ prompt, options }) {
  yield { type: "system", subtype: "init" };
  const ticket = extractTicket(prompt);
  const subagents = Object.keys(options.agents ?? {});
  // Scripted loop budget, mirroring what we measured on the real SDK:
  // the smallest maxTurns that works is 2 with subagents (call them, then
  // answer) and 1 without; the SDK then REPORTS num_turns as 4 and 2, because
  // delivering the structured answer is an extra, uncapped round-trip.
  const turnsNeeded = subagents.length > 0 ? 2 : 1;
  const reported = (turns: number): number => turns * 2;
  const maxTurns = options.maxTurns ?? Number.POSITIVE_INFINITY;

  if (maxTurns < 1) {
    yield { type: "result", subtype: "error_max_turns", num_turns: 0, total_cost_usd: 0 };
    return;
  }

  if (subagents.length > 0) {
    yield {
      type: "assistant",
      parent_tool_use_id: null,
      message: {
        content: subagents.map((name) => ({
          type: "tool_use",
          id: `offline-${name}`,
          name: "Agent",
          input: { subagent_type: name, description: `Ask ${name}`, prompt: JSON.stringify(ticket) },
        })),
      },
    };
    yield {
      type: "user",
      parent_tool_use_id: null,
      message: {
        content: subagents.map((name) => ({
          type: "tool_result",
          tool_use_id: `offline-${name}`,
          content: [{ type: "text", text: OFFLINE_REPLIES[name]?.(ticket.message ?? "") ?? "OPEN" }],
        })),
      },
    };
  }

  if (maxTurns < turnsNeeded) {
    yield { type: "result", subtype: "error_max_turns", num_turns: reported(maxTurns), total_cost_usd: 0 };
    return;
  }

  const priority = offlinePriority(ticket.message ?? "");
  const pending = subagents.length > 0 ? "(copied from the subagent trace)" : "OPEN — no specialist was called";
  yield {
    type: "result",
    subtype: "success",
    total_cost_usd: 0,
    num_turns: reported(turnsNeeded),
    structured_output: {
      ticket_id: ticket.ticket_id ?? "OPEN",
      priority,
      sentiment: priority === "high" ? "angry" : "neutral",
      recommended_action: ROUTE[priority],
      summary: `Customer ${ticket.customer ?? "OPEN"} wrote: "${(ticket.message ?? "").slice(0, 80)}"`,
      customer_reply: pending,
      risk_note: pending,
      draft_only: true,
      human_approval_required: true,
    },
  };
};

export const OFFLINE = "offline";

export interface Runtime {
  readonly query: QueryFn;
  /** `undefined` → SDK default model. */
  readonly model: string | undefined;
  readonly label: string;
}

/** Resolve `AGENT_MODEL` into a runtime. Pure apart from reading env. */
export const resolveRuntime = (name: string = process.env.AGENT_MODEL ?? OFFLINE): Runtime =>
  name === OFFLINE
    ? { query: offlineQuery, model: undefined, label: "offline (scripted, not model evidence)" }
    : { query: sdkQuery, model: name, label: `claude-agent-sdk/${name}` };
