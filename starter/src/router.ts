/**
 * STARTER · router.ts — LESSON 2 · Design (deterministic, no model)
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
export const parseJson = (_text: string): Result<unknown> => {
  // TODO: strip one ```json fence, JSON.parse inside try/catch, return ok/fail
  return fail(["TODO: parseJson"]);
};

/** Contract check + identity check: the decision must be about THIS ticket. */
export const validateDecision = (_ticket: Ticket, _raw: unknown): Result<TriageDecision> => {
  // TODO: parseDecision(raw), then check decision.ticket_id === ticket.ticket_id
  return fail(["TODO: validateDecision"]);
};

/** The n8n Switch + Set nodes. */
export const routeDecision = (_decision: TriageDecision): RoutedDraft => {
  // TODO: action = ROUTES[priority], team = TEAMS[action]; always draft_only + human_approval_required
  void ROUTES; void TEAMS;
  throw new Error("TODO: routeDecision");
};

/** parse → validate → route, as one pipeline. */
export const checkAndRoute = (ticket: Ticket, modelText: string): Result<RoutedDraft> => {
  const json = parseJson(modelText);
  if (!json.ok) return json;
  const decision = validateDecision(ticket, json.value);
  return decision.ok ? ok(routeDecision(decision.value)) : decision;
};
