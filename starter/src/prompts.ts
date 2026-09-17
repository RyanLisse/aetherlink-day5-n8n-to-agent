/** STARTER · Step 3a — fundamentals #1 (system message) and #2 (prompt). */
import type { Ticket } from "./contract.js";

// n8n system message was: "Always talk with the Customer Reply Agent and with the Risk Agent"
// TODO: role · specialists (exactly once each) · data-not-instructions ·
//       routing rule · copy ticket_id · no completed-action claims · OPEN ·
//       "Return ONLY one JSON object" with the contract fields.
//       Tag each rule with its intent.md section: [intent: …]
export const COORDINATOR_SYSTEM = `TODO`;

// n8n prompt was: "Customer: {{ $json.customer }}  Message: {{ $json.message }}"
// TODO: include ticket_id and fence the ticket as JSON inside <ticket>…</ticket>
export const buildTriagePrompt = (ticket: Ticket): string => `TODO ${ticket.customer}`;

// Copy these from the n8n "Customer Reply Agent" / "Risk Agent" system messages,
// then harden them (no refunds, no "logged/escalated", OPEN for unknowns).
export const CUSTOMER_REPLY_SYSTEM = `You are a customer support communication specialist.
TODO`;
export const RISK_SYSTEM = `You are a payment risk and escalation specialist.
TODO`;
