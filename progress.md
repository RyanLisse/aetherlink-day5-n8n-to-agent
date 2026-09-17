# Progress

Status: `STEP 6 · MAINTAIN — static checks verified; your live model run is OPEN`

This is a **current-state board**, not a diary. Update the rows; append one
line per run to the run log.

## SDLC board

| Phase | Branch | Artifact | State |
| --- | --- | --- | --- |
| 0 · Source | `main` | `n8n/support-triage.json`, `lessons/0-source.md` | `VERIFIED — sanitized export` |
| 1 · Plan | `step-1-plan` | `intent.md`, this file | `VERIFIED — facilitator template` |
| 2 · Design | `step-2-design` | `docs/design.md`, `src/contract.ts`, `src/router.ts`, `test/router.test.ts` | `VERIFIED — npm test` |
| 3a · Build · system + prompt | `step-3a-build-prompt` | `src/prompts.ts`, `src/runtime.ts`, `src/agent.ts` v1 | `VERIFIED — offline run` |
| 3b · Build · tools | `step-3b-build-tools` | `src/tools.ts` (subagents), `src/agent.ts` v2 | `VERIFIED — offline run` |
| 3c · Build · memory | `step-3c-build-memory` | `src/memory.ts`, `src/agent.ts` v3 | `VERIFIED — offline run` |
| 4 · Test | `step-4-test` | `test/*.test.ts`, `src/check.ts` | `VERIFIED — npm run verify` |
| 5 · Deploy | `step-5-deploy` | `src/cli.ts`, `.claude/agents/`, CI, `templates/handoff.md` | `VERIFIED — CI config; colleague reproduction OPEN` |
| 6 · Maintain | `step-6-maintain` | this board, `memory/MEMORY.md`, feedback to `intent.md` | `OPEN — needs your run` |

## Current verified state

- `npm run verify` (typecheck + tests + self-check): `VERIFIED — facilitator machine, Node 22`
- Offline agent run (`npm run triage -- fixtures/ticket.json`): `VERIFIED — scripted model, NOT model evidence`
- Facilitator live smoke run (`AGENT_MODEL=sonnet`, Claude Agent SDK 0.3.274): `VERIFIED — 2026-09-17, both subagents called once, contract PASS, ~$0.04; see docs/examples/live-run-wl-1026.json. Human content review: OPEN`
- Your live run (`AGENT_MODEL=sonnet`): `OPEN — needs your key or Claude login, and a reviewer`
- Claude Code subagent run (`.claude/agents/`): `OPEN — needs your Claude Code session and trace`
- n8n baseline execution: `OPEN — needs n8n credential selected in the UI`

## Run log

| When | Branch/commit | Input | Model | Command | Checker | Trace (reply/risk) | Reviewer · decision | OPEN |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `YYYY-MM-DD HH:MM` | `step-6-maintain@…` | `fixtures/ticket.json` | `offline` | `npm run triage -- fixtures/ticket.json --out participant-output/wl-1026.json` | `PASS` | `1 / 1` | `NAME · accept/revise/OPEN` | `live model` |

## Blockers

| Blocker | Impact | Owner | Status |
| --- | --- | --- | --- |
| No model credential in the room | live run cannot be claimed | Learner | `OPEN` |

## Lessons → next intent (Maintain)

Only write what a trace or checker actually showed.

- Live smoke run: the model's structured `risk_note` was a shortened paraphrase of the Risk subagent's output → keep copying `risk_note` / `customer_reply` from the trace (already in `src/agent.ts`). Evidence: trace vs. raw output of the smoke run.
- Live check of Lesson 3a (no subagents): the model wrote its own reply and risk note and chose `medium → investigate`; the contract still passed → a valid shape is not evidence, keep the subagent trace check.
- Loop budget (live, 17 Sep): without subagents `maxTurns: 1` succeeded (num_turns 2); with subagents `maxTurns: 1` → `error_max_turns`, `2` and `8` succeeded (num_turns 4) → default 8, specialists 2.
- Live smoke run: the SDK adds its own `StructuredOutput` tool call → excluded from the specialist trace check (`SDK_INTERNAL_TOOLS`).
