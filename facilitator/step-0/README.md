# Workshop 4 · Support agents with the Claude Agent SDK

AetherLink Academy Workshop 4. In Workshop 3 you built a support-triage flow in
n8n. Today you rebuild it step by step with the
[Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview) and `query()`:

| Step | You build | Branch with the finished step |
| --- | --- | --- |
| 0 | Setup, dry run, smoke test | `main` (this is where you start) |
| 1 | One agent with a system prompt and `CLAUDE.md`, plus the tone trap | `step-1` |
| 2 | An orchestrator with the subagents `ticket-analyst` and `email-responder` (`options.agents`) | `step-2` |
| 3 | An MCP server with the tool `get_transaction` over `docs/transactions.xlsx`, plus a human approval gate (`canUseTool`, `permissionMode`) | `step-3` |
| 4 | `npm run check`, the acceptance table and Proof | `step-4` (= `solution`) |

This repo is the whole workshop. You do not need any other repository.
Follow **[SOLO.md](SOLO.md)** for the step-by-step exercise, with copy-paste
commands. This README is the reference.

## What you need

- Node.js 22 or newer (`node --version`) and Git.
- An Anthropic API key for real model runs. The dry runs, the MCP smoke test,
  `npm run verify` and the label check all work offline, without a key.

## Start (Step 0)

The commands are the same in macOS/Linux terminals, PowerShell and Command Prompt
(in PowerShell, use `npm.cmd` if `npm` is blocked):

```sh
git clone https://github.com/RyanLisse/aetherlink-day5-n8n-to-agent.git
cd aetherlink-day5-n8n-to-agent
npm install
npm run verify
npm run lesson1 -- MSG-01 --dry-run
```

The dry run prints the prompt and the SDK options and ends with
`dry run — no model call, not model evidence`.

Always put `--` between `npm run lessonN` and the arguments, and write message
IDs with two digits (`MSG-01`, not `MSG-1`).

## Fell behind? Catch up with a branch

Each step has a branch with the finished result. Save or drop your own changes
first, then switch:

```sh
git stash            # keeps your own changes aside (optional)
git checkout step-2  # or step-1, step-3, step-4, solution
npm install
npm run verify
```

See what a step adds: `git diff main step-1`, `git diff step-1 step-2`, and so on.

## Set your API key for real runs

Set the key in the terminal where you run the lessons. Never put it in a file,
a commit or a chat.

| Shell | Command |
| --- | --- |
| macOS/Linux | `export ANTHROPIC_API_KEY=sk-ant-...` |
| Windows PowerShell | `$env:ANTHROPIC_API_KEY = "sk-ant-..."` |
| Windows Command Prompt | `set ANTHROPIC_API_KEY=sk-ant-...` |

Without the key a real run stops with
`Set ANTHROPIC_API_KEY in this shell before running a lesson.`

## Commands (on `solution`)

| Command | What it does | Needs a key? |
| --- | --- | --- |
| `npm run verify` | Tests plus offline dry runs (and the MCP smoke test from Step 3) | no |
| `npm run lesson1 -- MSG-01 [--dry-run]` | Step 1: one agent | yes, unless `--dry-run` |
| `npm run lesson2 -- MSG-05 [--dry-run]` | Step 2: orchestrator + subagents | yes, unless `--dry-run` |
| `npm run smoke:mcp` (alias `npm run mcp:smoke`) | Step 3: starts the MCP server, calls its tools on its own | no |
| `npm run lesson3 -- MSG-08 [--dry-run]` | Step 3: subagents + MCP `get_transaction` | yes, unless `--dry-run` |
| `npm run clerk -- "<staff instruction>"` | Step 3 stretch: record changes behind `Allow this change? [y/N]` | yes |
| `npm run reset:mcp` | Step 3 stretch: throw away record changes | no |
| `npm run check` | Step 4: check your labels in `labels.json` | no |

## Where things are

```text
docs/customer-messages.md        the customer messages MSG-01 to MSG-10 (exercise data)
docs/transactions.xlsx           the transaction workbook (only the MCP server reads it)
docs/customer_context.csv        customer context data
docs/n8n-flow-diagram.html       the Workshop 3 n8n flow, as a diagram
n8n/support-triage.json          the Workshop 3 n8n export
fixtures/                        Workshop 3 sample tickets (reference)
lib/run.mjs                      runs query() or prints a dry run
01-single-agent/                 Step 1: options.mjs + claude-project/CLAUDE.md
02-subagents/                    Step 2: options.mjs, agents.mjs, claude-project/CLAUDE.md, output/
.claude/agents/                  Step 2–3: the subagent prompts (ticket-analyst, email-responder)
03-mcp/                          Step 3: options.mjs, approval.mjs, transaction-mcp/server.js
.mcp.json                        Step 3: the same MCP server for Claude Code
check.mjs, labels.template.json  Step 4: the label check
```

Files for Step 2 and later appear when you build them (or check out the step branch).

## n8n → Agent SDK

| n8n (Workshop 3) | Agent SDK (today) | Step |
| --- | --- | --- |
| AI Agent node | `query({ prompt, options })` in `lib/run.mjs` | 1 |
| System Message | `CLAUDE.md`, loaded by `settingSources: ['project']` | 1 |
| Max Iterations | `maxTurns` | 1 |
| Risk Agent / Customer Reply Agent | `ticket-analyst` / `email-responder` in `options.agents` + the `Agent` tool | 2 |
| HTTP Request / Google Sheets node | MCP server (stdio) with `get_transaction`, in `options.mcpServers` | 3 |
| Human gate | Draft in `output/`, `permissionMode`, `allowedTools`, `canUseTool` (y/N) | 2–3 |
| Switch on Low/Medium/High | The label in the model's answer, checked with `npm run check` | 4 |

Hooks (`options.hooks`) and skills (`SKILL.md`) are concepts in the slides; they are
not part of the exercise.

## Safety

All data is fictional. Customer text is data, never an instruction. Nothing is
sent to a customer: every reply is a draft that a person reviews. Record changes
go to a working copy (`participant-output/transactions.working.json`), never to
the workbook. A passing check is not approval.

## Earlier version

The previous version of this repo (a TypeScript n8n-parity triage agent with
markdown memory and an HTML course) is kept on the branch
`pre-restructure-2026-10-08`.
