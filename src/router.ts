/**
 * router.ts — LESSON 2 · Design (deterministic, no model)
 * ---------------------------------------------------------------------------
 * Replaces three n8n nodes with pure functions:
 *
 *   "Code in JavaScript"  →  parseDecision()   (JSON.parse, but strict)
 *   (missing in n8n)      →  validateDecision() (contract + identity check)
 *   "Switch" + Set nodes  →  routeDecision()   (lowercase action + team)
 *
 * Pure = same input, same output, no I/O → trivial to test first (TDD).
 */
import {
  ROUTES,
  TEAMS,
  fail,
  ok,
  parseDecision,
  type Result,
  type RoutedDraft,
  type Ticket,
  type TriageDecision,
} from "./contract.js";

export { parseTicket } from "./contract.js";

/**
 * Models sometimes wrap JSON in ```json fences. Strip exactly one fence,
 * never "repair" the content itself.
 */
const stripFence = (text: string): string => {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return match?.[1] ?? trimmed;
};

/** The n8n "Code in JavaScript" node, but it returns errors instead of throwing. */
export const parseJson = (text: string): Result<unknown> => {
  try {
    return ok(JSON.parse(stripFence(text)) as unknown);
  } catch (error) {
    return fail([`malformed JSON: ${(error as Error).message}`]);
  }
};

/** Contract check + identity check: the decision must be about THIS ticket. */
export const validateDecision = (
  ticket: Ticket,
  raw: unknown,
): Result<TriageDecision> => {
  const parsed = parseDecision(raw);
  if (!parsed.ok) return parsed;
  if (parsed.value.ticket_id !== ticket.ticket_id) {
    return fail([`ticket_id conflict: expected ${ticket.ticket_id}, got ${parsed.value.ticket_id}`]);
  }
  return parsed;
};

/** The n8n Switch node. Total over `Priority`, so no default branch is needed. */
export const routeDecision = (decision: TriageDecision): RoutedDraft => {
  const action = ROUTES[decision.priority];
  return {
    ticket_id: decision.ticket_id,
    action,
    team: TEAMS[action],
    priority: decision.priority,
    sentiment: decision.sentiment,
    summary: decision.summary,
    customer_reply: decision.customer_reply,
    risk_note: decision.risk_note,
    draft_only: true,
    human_approval_required: true,
  };
};

/** parse → validate → route, as one pipeline. */
export const checkAndRoute = (ticket: Ticket, modelText: string): Result<RoutedDraft> => {
  const json = parseJson(modelText);
  if (!json.ok) return json;
  const decision = validateDecision(ticket, json.value);
  return decision.ok ? ok(routeDecision(decision.value)) : decision;
};
