# SOLO map — Workshop 4 · n8n → Claude Agent SDK

Pedagogy for every beat: **Uitleg → Voordoen → Zelf doen** (on your own machine).
Deck: Academy `/workshop/4`. Shared acceptance fixture with Workshop 3.

| SOLO | You do | Maps to |
| --- | --- | --- |
| **0** | Clone, `npm install`, read `n8n/support-triage.json` | Open / parity |
| **1** | Confirm fixture tickets + expected L/M/H in `fixtures/expected-labels.json` | Parity zelf doen |
| **2** | First agent: ticket → priority (`systemPrompt` + `prompt`) | Claude L2 |
| **3** | Add Reply / Risk as subagents (stretch) | Skills stretch |
| **4** | Acceptance: same labels as n8n on shared tickets | Acceptance |

Stay on **one branch** (`main` or your `work/<name>`). No phase ladder.

---

## SOLO 0 — Open the source

**Uitleg:** Same support-triage agent as Workshop 3; today you rebuild it on the Claude Agent SDK.  
**Voordoen:** Facilitator opens `n8n/support-triage.json` and names the AI Agent + Reply + Risk tools.  
**Zelf doen:**

```bash
git clone https://github.com/RyanLisse/aetherlink-day5-n8n-to-agent.git
cd aetherlink-day5-n8n-to-agent
git switch -c work/<your-name>
npm install
npm test -- test/n8n-source.test.ts
```

Checklist: Node 20+ · install ok · you can point at Ticket Input, AI Agent, Customer Reply Agent, Risk Agent, Switch → Low/Medium/High.

---

## SOLO 1 — Confirm the fixture

**Uitleg:** Labels do not move. Low / medium / high on the **same** tickets as n8n.  
**Voordoen:** Facilitator shows expected row for WL-1026 → high, WL-1027 → low.  
**Zelf doen:** Open `fixtures/ticket.json`, `fixtures/ticket-followup.json`, and `fixtures/expected-labels.json`. Write the expected priority next to each ticket_id (paper or notes).

Checklist: both happy-path tickets listed · expected L/M/H match the JSON · W3 Proof (if you have it) open for compare.

---

## SOLO 2 — First agent (`systemPrompt` + `prompt`) · ≥ L2

**Uitleg:** Claude Agent SDK `query()` — `options.systemPrompt` (who + rules) and `prompt` (this ticket). Loop budget: `maxTurns`.  
**Voordoen:** Facilitator runs offline triage once and shows the priority.  
**Zelf doen:**

```bash
# Offline — no API key. Scripted; not model evidence.
npm run triage -- fixtures/ticket.json --dry-run

# Optional real run (needs key in the shell only):
# export ANTHROPIC_API_KEY=…
# AGENT_MODEL=sonnet npm run triage -- fixtures/ticket.json --dry-run
```

Read and, if the facilitator asks, edit `src/prompts.ts` (`COORDINATOR_SYSTEM`, `buildTriagePrompt`) and the loop in `src/agent.ts`. Re-run offline.

Checklist: runs on ≥1 fixture · priority matches expected for that ticket · human reviewed the draft · no secrets in files.

---

## SOLO 3 — Reply / Risk subagents (stretch)

**Uitleg:** When one agent is enough vs specialists — mirrors n8n L3 (Customer Reply + Risk).  
**Voordoen:** Facilitator shows `src/tools.ts` + `.claude/agents/` and a trace with both calls.  
**Zelf doen:** Ensure the coordinator calls `customer-reply` and `risk` exactly once; compare `customer_reply` / `risk_note` to the trace. Optional: skim `src/memory.ts` (markdown memory per ticket id).

```bash
npm run triage -- fixtures/ticket.json --dry-run
npm run triage -- fixtures/ticket-followup.json --dry-run
```

Checklist: two specialist roles · joint draft · gate (`draft_only` + `human_approval_required`) · stretch only.

---

## SOLO 4 — Acceptance

**Uitleg:** Shared tests both stacks. Mismatch = bug or prompt issue, not a new product.  
**Voordoen:** One ticket side-by-side (n8n label vs Claude/offline label).  
**Zelf doen:**

```bash
npm run verify
npm run triage -- fixtures/ticket.json --dry-run
npm run triage -- fixtures/ticket-followup.json --dry-run
# Optional shape check once you save a decision:
# npm run check -- --ticket fixtures/ticket.json --decision participant-output/….json
```

Fill a small table: ticket → expected (from `expected-labels.json`) → your run → match? Human gate before you claim Proof.

Checklist: WL-1026 high · WL-1027 low · adversarial treated as data · malformed rejected · Proof note ready for the room.

---

## Safety (every SOLO)

Fictional data only. `draft_only: true` · `human_approval_required: true`. No refunds, sends, CRM writes, or secrets in the repo. Offline default needs no key.
