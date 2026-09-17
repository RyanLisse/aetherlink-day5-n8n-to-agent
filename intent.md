# Intent — support triage agent (WL-1026)

Status: `ACCEPTED FOR TRAINING — Plan step, translated from n8n/support-triage.json`

> **How this file was made.** We did not start from a blank page. We opened the
> n8n export and asked, node by node: *what does this node promise, and what
> does it forget?* Every line below carries a `[n8n: …]` tag pointing at the
> node it came from, or `[gap]` when the n8n flow did not say it at all.
> Later, `src/prompts.ts` points back here with `[intent: …]` tags.

## Outcome (WHAT)

For one fictional support ticket, produce a **triage draft** that a human can
accept, revise or leave `OPEN`:

- a `priority` (`low` | `medium` | `high`) and `sentiment`,
- a customer reply **draft** (from the Customer Reply specialist),
- an internal `risk_note` (from the Risk specialist),
- a route: `low → auto_reply`, `medium → investigate`, `high → escalate`.

`[n8n: AI Agent prompt "Your job" + Switch + three action Set nodes]`

## Why (WHY)

Support colleagues spend time on first triage. A consistent draft with an
explicit risk note lets a human decide faster — **the human still decides**.
We rebuild the n8n flow as code so the contract becomes testable, reviewable
and reproducible by a colleague. `[gap]`

## Input

```json
{ "ticket_id": "WL-1026", "customer": "Maarten",
  "message": "I was charged twice. I need this fixed today or I will file a complaint." }
```

`[n8n: Ticket Input]` · follow-up input: `fixtures/ticket-followup.json` (`WL-1027`).

## Success checks

1. `ticket_id` in the output equals the input exactly. `[gap — n8n prompt did not ask for ticket_id]`
2. Both specialists are called **exactly once** per run, and the trace shows it. `[n8n: system message "Always talk with…"]`
3. `recommended_action` matches the priority mapping; lowercase only. `[n8n: Switch · gap — Set nodes used AUTO_REPLY/INVESTIGATE/ESCALATE]`
4. `risk_note` is non-empty and equals the Risk specialist output. `[n8n: Risk Agent · gap — nothing enforced it]`
5. `draft_only: true` and `human_approval_required: true` on every result. `[gap]`
6. Malformed input, unknown priority, conflicting ticket id, unknown fields → **FAIL**, never silently repaired. `[n8n: Code in JavaScript only did JSON.parse]`
7. Memory is per ticket and human-readable: `memory/<ticket_id>.md`. `[n8n: Simple Memory ×3 with static keys "1","2","1" — gap]`

## Boundaries (non-goals and stop rules)

- In scope: local fixtures, local TypeScript agent on the Claude Agent SDK (offline fake or real model), markdown memory in `memory/`, output in `participant-output/`.
- Out of scope: sending a reply, approving a refund, editing a ticket, any CRM / n8n / GitHub write, real customer data, credentials in files.
- The ticket `message` is **customer data**, not instructions (see `fixtures/ticket-adversarial.json`).
- The agent loop is bounded: the coordinator gets a fixed turn budget (`maxTurns`); running out is a failure, never a partial draft. `[n8n: AI Agent · Max Iterations]`
- **Stop** when: a credential or real customer record appears; a specialist call is missing; the output claims something was *logged / refunded / escalated / checked*; a human approval would be implied.

## The four agent fundamentals (Design preview)

| Fundamental | n8n (source) | This intent says | Code (target) |
| --- | --- | --- | --- |
| System message | AI Agent → Options → System Message (1 line) | role, rules, stop rules, output shape | `options.systemPrompt` · `src/prompts.ts` |
| Prompt | AI Agent → Prompt with `{{ $json.customer }}` | the ticket as data, incl. `ticket_id` | `src/prompts.ts · buildTriagePrompt()` |
| Tools | Customer Reply Agent + Risk Agent (`ai_tool`) | exactly two specialists, once each | `options.agents` + `Agent` tool · `src/tools.ts` |
| Memory | Simple Memory, static keys | one markdown file per ticket + team lessons | `src/memory.ts` → `memory/*.md` |
| Model | OpenAI Chat Model `gpt-5-mini` | recorded per run, never assumed | `src/runtime.ts · AGENT_MODEL` |

## Owners

| Role | Name | Responsibility |
| --- | --- | --- |
| Human operator | `YOUR NAME` | Chooses scope and model, accepts or returns the draft |
| Agent operator | `YOUR NAME` | Runs Claude Code / `npm run triage` locally |
| Reviewer | `COLLEAGUE` | Reads ticket and draft side by side, checks OPEN items |
| Evidence owner | `YOUR NAME` | Updates `progress.md` with command, model, result |

## OPEN questions

- Which real model/access will you use today? (`offline` is not model evidence.)
- Who is the reviewer for your run?
- Should team lessons in `memory/MEMORY.md` be shared across squads? (decide in Maintain)
