/**
 * LESSON 2 · Design tests — written BEFORE the code (TDD red → green).
 * No model, no network, no test framework beyond Node's built-in `node:test`.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DECISION_SCHEMA, ROUTES } from "../src/contract.js";
import { checkAndRoute, parseTicket, routeDecision, validateDecision } from "../src/router.js";

const ticket = { ticket_id: "WL-1026", customer: "Maarten", message: "I was charged twice." };
const decision = {
  ticket_id: "WL-1026",
  priority: "high",
  sentiment: "angry",
  recommended_action: "escalate",
  summary: "Possible duplicate charge.",
  customer_reply: "A colleague will review this.",
  risk_note: "Complaint threat; check payment records (OPEN).",
  draft_only: true,
  human_approval_required: true,
} as const;

describe("parseTicket", () => {
  it("accepts the n8n Ticket Input", () => {
    assert.equal(parseTicket(ticket).ok, true);
  });
  const bad: [string, unknown][] = [
    ["non-string message", { ...ticket, message: 42 }],
    ["unknown field", { ...ticket, unexpected: "x" }],
    ["empty customer", { ...ticket, customer: "  " }],
    ["bad id", { ...ticket, ticket_id: "1026" }],
    ["not an object", "WL-1026"],
  ];
  for (const [name, raw] of bad) {
    it(`rejects ${name}`, () => assert.equal(parseTicket(raw).ok, false));
  }
});

describe("routeDecision (the n8n Switch)", () => {
  for (const [priority, action] of Object.entries(ROUTES)) {
    it(`${priority} → ${action}`, () => {
      const d = { ...decision, priority, recommended_action: action } as never;
      assert.equal(routeDecision(d).action, action);
    });
  }
  it("keeps ticket_id, risk_note and both safety flags", () => {
    const routed = routeDecision(decision);
    assert.equal(routed.ticket_id, "WL-1026");
    assert.equal(routed.risk_note, decision.risk_note);
    assert.equal(routed.team, "Payments escalation team");
    assert.equal(routed.draft_only, true);
    assert.equal(routed.human_approval_required, true);
  });
});

describe("validateDecision", () => {
  it("passes a valid decision", () => {
    assert.equal(validateDecision(ticket, decision).ok, true);
  });
  const bad: [string, unknown][] = [
    ["unknown priority", { ...decision, priority: "urgent" }],
    ["priority/action conflict", { ...decision, priority: "low" }],
    ["missing risk_note", { ...decision, risk_note: undefined }],
    ["draft_only false", { ...decision, draft_only: false }],
    ["human_approval_required false", { ...decision, human_approval_required: false }],
    ["uppercase n8n action", { ...decision, recommended_action: "ESCALATE" }],
    ["extra field", { ...decision, refund_approved: true }],
  ];
  for (const [name, raw] of bad) {
    it(`rejects ${name}`, () => assert.equal(validateDecision(ticket, raw).ok, false));
  }
  it("rejects a decision about another ticket", () => {
    const result = validateDecision(ticket, { ...decision, ticket_id: "WL-9999" });
    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.errors.join(), /ticket_id conflict/);
  });
});

describe("DECISION_SCHEMA (for options.outputFormat)", () => {
  it("lists every field of the decision and forbids extras", () => {
    assert.deepEqual([...DECISION_SCHEMA.required].sort(), Object.keys(decision).sort());
    assert.equal(DECISION_SCHEMA.additionalProperties, false);
  });
});

describe("checkAndRoute (Code node + validator + Switch)", () => {
  it("accepts fenced JSON", () => {
    assert.equal(checkAndRoute(ticket, "```json\n" + JSON.stringify(decision) + "\n```").ok, true);
  });
  it("rejects malformed JSON instead of throwing", () => {
    assert.equal(checkAndRoute(ticket, "{not json").ok, false);
  });
});
