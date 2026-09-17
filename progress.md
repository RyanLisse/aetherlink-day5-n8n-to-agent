# Progress

Status: `STEP 3b · BUILD · tools — static checks verified; later phases OPEN`

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
| 3c · Build · memory | `step-3c-build-memory` | `src/memory.ts`, `src/agent.ts` v3 | `OPEN — next branch` |
| 4 · Test | `step-4-test` | `test/*.test.ts`, `src/check.ts` | `OPEN — next branch` |
| 5 · Deploy | `step-5-deploy` | `src/cli.ts`, `.claude/agents/`, CI, `templates/handoff.md` | `OPEN — next branch` |
| 6 · Maintain | `step-6-maintain` | this board, `memory/MEMORY.md`, feedback to `intent.md` | `OPEN — next branch` |

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

- `NONE — no validated learning yet`
