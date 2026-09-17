/**
 * check.ts — LESSON 4 · Test · validate a saved decision without any model
 * ---------------------------------------------------------------------------
 *   npm run check                                             (self-check)
 *   npm run check -- --ticket fixtures/ticket.json --decision participant-output/wl-1026.json
 *
 * Accepts either the coordinator decision (recommended_action) or the routed
 * draft written by `npm run triage -- --out` (action + team).
 * Proves SHAPE and ROUTING only — never business approval.
 */
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { ROUTES, fail, ok, type Result, type RoutedDraft, type Ticket } from "./contract.js";
import { checkAndRoute, parseJson, parseTicket } from "./router.js";

const readTicket = async (path: string): Promise<Result<Ticket>> => {
  const json = parseJson(await readFile(path, "utf8"));
  return json.ok ? parseTicket(json.value) : json;
};

/** A routed draft is converted back to a decision so one validator covers both. */
const asDecisionText = (text: string): string => {
  const json = parseJson(text);
  if (!json.ok || typeof json.value !== "object" || json.value === null) return text;
  const { action, team: _team, ...rest } = json.value as Record<string, unknown>;
  return action === undefined
    ? text
    : JSON.stringify({ ...rest, recommended_action: action });
};

export const checkFiles = async (ticketPath: string, decisionPath: string): Promise<Result<RoutedDraft>> => {
  const ticket = await readTicket(ticketPath);
  if (!ticket.ok) return fail(ticket.errors.map((e) => `ticket: ${e}`));
  return checkAndRoute(ticket.value, asDecisionText(await readFile(decisionPath, "utf8")));
};

/** Built-in negative and positive cases — the TS port of the Python self-check. */
const selfCheck = (): Result<string> => {
  const ticket: Ticket = { ticket_id: "WL-1026", customer: "Maarten", message: "I was charged twice." };
  const base = {
    ticket_id: "WL-1026",
    sentiment: "angry",
    summary: "Possible duplicate charge.",
    customer_reply: "A colleague will review this.",
    risk_note: "Complaint threat; check payment records (OPEN).",
    draft_only: true,
    human_approval_required: true,
  };
  const expectPass = Object.entries(ROUTES).map(([priority, action]) => ({
    name: `${priority} → ${action}`,
    text: JSON.stringify({ ...base, priority, recommended_action: action }),
    pass: true,
  }));
  const expectFail = [
    { name: "malformed JSON", text: "{not json" },
    { name: "unknown priority", text: JSON.stringify({ ...base, priority: "urgent", recommended_action: "escalate" }) },
    { name: "priority/action conflict", text: JSON.stringify({ ...base, priority: "low", recommended_action: "escalate" }) },
    { name: "ticket_id conflict", text: JSON.stringify({ ...base, ticket_id: "WL-9999", priority: "high", recommended_action: "escalate" }) },
    { name: "missing risk_note", text: JSON.stringify({ ...base, risk_note: undefined, priority: "high", recommended_action: "escalate" }) },
    { name: "safety flag false", text: JSON.stringify({ ...base, draft_only: false, priority: "high", recommended_action: "escalate" }) },
    { name: "unknown field", text: JSON.stringify({ ...base, priority: "high", recommended_action: "escalate", refund: true }) },
  ].map((c) => ({ ...c, pass: false }));

  const wrong = [...expectPass, ...expectFail].filter(
    (c) => checkAndRoute(ticket, c.text).ok !== c.pass,
  );
  return wrong.length === 0
    ? ok(`${expectPass.length} valid routes, ${expectFail.length} rejection cases`)
    : fail(wrong.map((c) => `self-check case failed: ${c.name}`));
};

const main = async (): Promise<number> => {
  const { values } = parseArgs({
    options: { ticket: { type: "string" }, decision: { type: "string" } },
  });

  const self = selfCheck();
  if (!self.ok) {
    console.error(`FAIL self-check\n  - ${self.errors.join("\n  - ")}`);
    return 1;
  }
  console.log(`PASS self-check: ${self.value}`);

  if (values.ticket && values.decision) {
    const result = await checkFiles(values.ticket, values.decision);
    if (!result.ok) {
      console.error(`FAIL ${values.decision}\n  - ${result.errors.join("\n  - ")}`);
      return 1;
    }
    console.log(JSON.stringify(result.value, null, 2));
    console.log(`PASS ${values.decision}: shape, identity and routing`);
  }
  console.log("OPEN: a human must review the draft before any action is taken");
  return 0;
};

if (process.argv[1]?.endsWith("check.ts")) {
  main().then((code) => process.exit(code));
}
