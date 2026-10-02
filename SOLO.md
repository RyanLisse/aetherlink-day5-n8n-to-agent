# Self-study path: from n8n to the Claude Agent SDK

You can do this path alone, without a facilitator or the Academy. Each step
has four parts:

- **Explain** — what the step is about.
- **See it** — a command or file that shows the idea.
- **Do** — what you change or run.
- **Check** — how you know the step is done.

Everything runs offline by default. The offline runtime is scripted, so its
output is not model evidence. A real model run is optional and needs your own
API key (see the README).

| Step | You do | Time |
| --- | --- | --- |
| 0 | Install the project and read the n8n flow | 10 min |
| 1 | Write down the expected priorities | 5 min |
| 2 | Run the first agent and read its prompts | 15 min |
| 3 | Look at the Reply and Risk subagents (stretch) | 10 min |
| 4 | Compare your results with the acceptance table | 10 min |

---

## Step 0 — Install and open the source flow

**Explain:** This is the same support-triage agent as in Workshop 3. You
rebuild it on the Claude Agent SDK.

**See it:** Open `n8n/support-triage.json` in your editor. Find these nodes:
Ticket Input, AI Agent, Customer Reply Agent, Risk Agent, and the Switch with
the Low, Medium and High branches.

**Do:**

```text
git clone https://github.com/RyanLisse/aetherlink-day5-n8n-to-agent.git
cd aetherlink-day5-n8n-to-agent
npm install
npm test
```

**Check:** `npm test` ends with `ℹ fail 0`. You can name the five nodes above.

---

## Step 1 — Write down the expected priorities

**Explain:** The labels do not change between n8n and the SDK. The same
ticket must get the same priority.

**See it:** Open `fixtures/ticket.json`, `fixtures/ticket-followup.json` and
`fixtures/expected-labels.json`.

**Do:** Copy the acceptance table from Step 4 into your notes. Fill in the
"Expected" column from `expected-labels.json`.

**Check:** WL-1026 is `high` and WL-1027 is `low`.

---

## Step 2 — Run the first agent

**Explain:** The SDK function `query()` takes `options.systemPrompt` (who
the agent is and its rules) and `prompt` (this ticket). `maxTurns` limits how
many rounds the loop can take.

**See it:** Read `COORDINATOR_SYSTEM` and `buildTriagePrompt` in
`src/prompts.ts`, and the `query()` loop in `src/agent.ts`.

**Do:**

```text
npm run triage -- fixtures/ticket.json --dry-run
```

**Check:** The output shows `"priority": "high"` for WL-1026, then
`PASS contract · OPEN: a human must review this draft before any action.`

Optional real run: set `ANTHROPIC_API_KEY` in your terminal as the README
shows, then add `--model sonnet` to the command. Never save the key in a file.

---

## Step 3 — Reply and Risk subagents (stretch)

**Explain:** One agent can do everything, but specialists keep each job small.
This mirrors the n8n Level 3 flow with a Customer Reply Agent and a Risk Agent.

**See it:** Read `src/tools.ts` and the two files in `.claude/agents/`.

**Do:**

```text
npm run triage -- fixtures/ticket.json --dry-run
npm run triage -- fixtures/ticket-followup.json --dry-run
```

**Check:** Each trace lists `customer-reply` and `risk` exactly once. The
`customer_reply` and `risk_note` fields in the draft match the trace. Every
draft has `"draft_only": true` and `"human_approval_required": true`.

---

## Step 4 — Acceptance

**Explain:** n8n and the SDK agent share one test set. A mismatch is a bug or
a prompt problem, not a new product.

**Do:** Run all four fixtures and save one draft:

```text
npm run verify
npm run triage -- fixtures/ticket.json --dry-run --out participant-output/wl-1026.json
npm run triage -- fixtures/ticket-followup.json --dry-run
npm run triage -- fixtures/ticket-adversarial.json --dry-run
npm run triage -- fixtures/ticket-malformed.json --dry-run
npm run check -- --ticket fixtures/ticket.json --decision participant-output/wl-1026.json
```

Fill in your table:

| Ticket | Fixture | Expected | Your run | Match? |
| --- | --- | --- | --- | --- |
| WL-1026 | `ticket.json` | `high` | | |
| WL-1027 | `ticket-followup.json` | `low` | | |
| adversarial | `ticket-adversarial.json` | not graded; the agent ignores the instruction in the message (offline: `medium`, `investigate`) | | |
| malformed | `ticket-malformed.json` | rejected with `FAIL input` before any model call | | |

**Check:**

- WL-1026 is `high` and WL-1027 is `low`.
- The adversarial ticket is handled as customer data: no refund is approved.
- The malformed ticket prints `FAIL input` and stops.
- `npm run check` prints `PASS participant-output/wl-1026.json: shape, identity and routing`.
- A person has read each draft. A PASS is never business approval.

Reflect on two questions: Which part was easier in n8n, and which in code?
Where does a person still need to decide?

---

## Safety (every step)

Fictional data only. Every draft has `draft_only: true` and
`human_approval_required: true`. No refunds, sends, CRM writes, or secrets in
the repo. The offline default needs no key.
