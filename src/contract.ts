/**
 * contract.ts — LESSON 2 · Design
 * ---------------------------------------------------------------------------
 * The contract is the one thing n8n and the agent MUST agree on.
 * No validation library: plain TypeScript types, one JSON Schema object for
 * the Claude Agent SDK (`options.outputFormat`), and small pure checks.
 *
 * n8n source                     →  here
 * ─────────────────────────────────────────────────────────────────────────
 * "Ticket Input" (Set node)      →  `Ticket` + `parseTicket()`
 * AI Agent "Return ONLY JSON"    →  `TriageDecision` + `DECISION_SCHEMA`
 *                                   (+ ticket_id, draft_only, human_approval_required,
 *                                    which the n8n prompt did NOT require)
 * Switch (low / medium / high)   →  `ROUTES` (lowercase, deterministic)
 */

// ── Enumerations ──────────────────────────────────────────────────────────
export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SENTIMENTS = ["neutral", "frustrated", "angry"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const ACTIONS = ["auto_reply", "investigate", "escalate"] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * The n8n Switch node, as data. `satisfies` proves every priority has exactly
 * one action — adding a priority without a route is a type error.
 */
export const ROUTES = {
  low: "auto_reply",
  medium: "investigate",
  high: "escalate",
} as const satisfies Record<Priority, Action>;

/** Which (fictional) team would pick up the draft — mirrors the n8n Set nodes. */
export const TEAMS = {
  auto_reply: "Self-service support",
  investigate: "Support team",
  escalate: "Payments escalation team",
} as const satisfies Record<Action, string>;

// ── Shapes ────────────────────────────────────────────────────────────────
/** One synthetic support ticket. The `message` is customer DATA, never policy. */
export interface Ticket {
  readonly ticket_id: string;
  readonly customer: string;
  readonly message: string;
}

/** The coordinator's decision. Both safety flags are the literal `true`. */
export interface TriageDecision {
  readonly ticket_id: string;
  readonly priority: Priority;
  readonly sentiment: Sentiment;
  readonly recommended_action: Action;
  readonly summary: string;
  readonly customer_reply: string;
  readonly risk_note: string;
  readonly draft_only: true;
  readonly human_approval_required: true;
}

/** What the router hands to a human — the replacement for the n8n action Set nodes. */
export interface RoutedDraft {
  readonly ticket_id: string;
  readonly action: Action;
  readonly team: (typeof TEAMS)[Action];
  readonly priority: Priority;
  readonly sentiment: Sentiment;
  readonly summary: string;
  readonly customer_reply: string;
  readonly risk_note: string;
  readonly draft_only: true;
  readonly human_approval_required: true;
}

/**
 * The same decision as JSON Schema. Passed to the Claude Agent SDK as
 * `outputFormat: { type: "json_schema", schema: DECISION_SCHEMA }`, so the
 * model must answer in this shape. The routing rule is checked in code.
 */
export const DECISION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "ticket_id",
    "priority",
    "sentiment",
    "recommended_action",
    "summary",
    "customer_reply",
    "risk_note",
    "draft_only",
    "human_approval_required",
  ],
  properties: {
    ticket_id: { type: "string", minLength: 1 },
    priority: { type: "string", enum: [...PRIORITIES] },
    sentiment: { type: "string", enum: [...SENTIMENTS] },
    recommended_action: { type: "string", enum: [...ACTIONS] },
    summary: { type: "string", minLength: 1 },
    customer_reply: { type: "string", minLength: 1 },
    risk_note: { type: "string", minLength: 1 },
    draft_only: { type: "boolean", const: true },
    human_approval_required: { type: "boolean", const: true },
  },
} as const;

// ── Result type (no exceptions across module boundaries) ─────────────────
export type Result<T, E = string[]> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const fail = <E = string[]>(errors: E): Result<never, E> => ({ ok: false, errors });

// ── Tiny pure checks ──────────────────────────────────────────────────────
type Json = Readonly<Record<string, unknown>>;

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

const nonEmpty = (obj: Json, key: string): string[] =>
  typeof obj[key] === "string" && (obj[key] as string).trim().length > 0
    ? []
    : [`${key}: expected a non-empty string`];

const oneOf = (obj: Json, key: string, allowed: readonly string[]): string[] =>
  allowed.includes(obj[key] as string) ? [] : [`${key}: expected one of ${allowed.join(" | ")}, got ${JSON.stringify(obj[key])}`];

const isTrue = (obj: Json, key: string): string[] => (obj[key] === true ? [] : [`${key}: must be true`]);

const onlyKeys = (obj: Json, allowed: readonly string[]): string[] =>
  Object.keys(obj)
    .filter((k) => !allowed.includes(k))
    .map((k) => `${k}: unknown field`);

const TICKET_KEYS = ["ticket_id", "customer", "message"] as const;

/** Validate an unknown value as a Ticket (malformed input is rejected, not "fixed"). */
export const parseTicket = (raw: unknown): Result<Ticket> => {
  if (!isObject(raw)) return fail(["ticket: expected a JSON object"]);
  const errors = [
    ...TICKET_KEYS.flatMap((k) => nonEmpty(raw, k)),
    ...(typeof raw.ticket_id === "string" && !/^WL-\d+$/.test(raw.ticket_id)
      ? ["ticket_id: must look like WL-1234"]
      : []),
    ...onlyKeys(raw, TICKET_KEYS),
  ];
  return errors.length === 0 ? ok(raw as unknown as Ticket) : fail(errors);
};

/** Validate an unknown value as a TriageDecision, including the routing rule. */
export const parseDecision = (raw: unknown): Result<TriageDecision> => {
  if (!isObject(raw)) return fail(["decision: expected a JSON object"]);
  const errors = [
    ...["ticket_id", "summary", "customer_reply", "risk_note"].flatMap((k) => nonEmpty(raw, k)),
    ...oneOf(raw, "priority", PRIORITIES),
    ...oneOf(raw, "sentiment", SENTIMENTS),
    ...oneOf(raw, "recommended_action", ACTIONS),
    ...isTrue(raw, "draft_only"),
    ...isTrue(raw, "human_approval_required"),
    ...onlyKeys(raw, DECISION_SCHEMA.required),
  ];
  if (errors.length > 0) return fail(errors);
  const priority = raw.priority as Priority;
  return ROUTES[priority] === raw.recommended_action
    ? ok(raw as unknown as TriageDecision)
    : fail([`recommended_action: priority/action conflict (${priority} must route to ${ROUTES[priority]})`]);
};
