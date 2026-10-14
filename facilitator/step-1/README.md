# Workshop 4 · Support agents with Claude Code and the Agent SDK

AetherLink Academy Workshop 4. In Workshop 3 you built a support-triage flow in
n8n with Maarten: Switch, Chat trigger, Simple Memory, AI Agent, Structured Output
Parser, three sub agents and a Data Table. Today you rebuild it with Claude Code and
the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview):

| Step | You build | Branch with the finished step |
| --- | --- | --- |
| 0 | Setup, customer context, offline chat and Switch routing | `main` (this is where you start) |
| 1 | One agent with a system prompt, structured priority output and the tone trap | `step-1` |
| 2 | An orchestrator with the `risk-agent` and `customer-reply-agent` subagents | `step-2` |
| 3 | Read-only transaction and customer MCP tools with human review of reply drafts | `step-3` |
| 4 | Acceptance table and `npm run check` | `step-4` (= `solution`) |
| 5 | Build your own agent with the SDK or Claude Code | `step-4` (= `solution`) |

This repo is the whole workshop. You do not need any other repository.
Follow **[SOLO.md](SOLO.md)** for the step-by-step exercise, with copy-paste
commands. This README is the reference.

## Before you start

Install Node.js 22 or newer, Git, and Claude Code. Follow [Set up Workshop 4](docs/SETUP.md).
Claude Code is the default backend and uses your local Claude login. An API key is optional.

| Backend | Needs | Command |
| --- | --- | --- |
| `claude-code` (default without a key) | Claude Code installed and logged in | `npm run lesson1 -- MSG-01` |
| `sdk` | `ANTHROPIC_API_KEY` | `npm run lesson1 -- MSG-01 --backend sdk` |
| `sdk-login` | Claude Code login | `npm run lesson1 -- MSG-01 --backend sdk-login` |

Anthropic's Agent SDK documentation says third-party products may not offer claude.ai login for SDK agents without approval. Use `sdk-login` for your own local learning only.
Use Claude Code `2.1.205` or newer; earlier versions could silently ignore an invalid `--json-schema`.

## Start (Step 0)

The commands are the same in macOS/Linux terminals, PowerShell and Command Prompt
(in PowerShell, use `npm.cmd` if `npm` is blocked):

```sh
git clone https://github.com/RyanLisse/aetherlink-day5-n8n-to-agent.git
cd aetherlink-day5-n8n-to-agent
npm ci
npm run verify
npm run doctor
npm run lesson1 -- MSG-01 --dry-run
npm run chat -- --dry-run
```

The dry run prints the prompt, options, and Claude Code equivalent. It ends with
`dry run — no model call, not model evidence`.

Always put `--` between `npm run lessonN` and the arguments, and write message
IDs with two digits (`MSG-01`, not `MSG-1`).

## Fell behind? Catch up with a branch

Each step has a branch with the finished result. Fetch first; if you have local
changes or untracked files, save or drop them:

```sh
git stash -u
git fetch origin
git switch step-2  # or step-1, step-3, step-4, solution
npm ci
npm run verify
```

See what a step adds: `git diff origin/main origin/step-1`,
`git diff origin/step-1 origin/step-2`, and so on.

## Commands (on `solution`)

| Command | What it does | Needs a key? |
| --- | --- | --- |
| `npm run verify` | Tests plus offline dry runs (and the MCP smoke test from Step 3) | no |
| `npm run chat [-- --lesson 1|2|3] [--structured]` | Interactive chat; free-form by default, `--structured` keeps the lesson schema, `--no-memory` starts a fresh session per turn | yes |
| `npm run chat -- --dry-run` | Print the default chat options without calling a model | no |
| `npm run lesson1 -- MSG-01 [--dry-run]` | Step 1: one agent | yes, unless `--dry-run` |
| `npm run lesson2 -- MSG-05 [--dry-run]` | Step 2: orchestrator + subagents | yes, unless `--dry-run` |
| `npm run smoke:mcp` | Step 3: starts the MCP server, calls its tools on its own | no |
| `npm run lesson3 -- MSG-08 [--dry-run]` | Step 3: subagents + MCP `get_transaction` | yes, unless `--dry-run` |
| `npm run check` | Step 4: check your labels in `labels.json` | no |
| `npm run doctor` | Show Node.js, Claude Code, and selected backend status | no |

## Where things are

```text
docs/customer-messages.md        the customer messages MSG-01 to MSG-10 (exercise data)
docs/transactions.xlsx           the transaction workbook (only the MCP server reads it)
docs/customer_context.csv        customer context data
docs/n8n-flow-diagram.html       the Workshop 3 n8n flow, as a diagram
n8n/support-triage.json          the Workshop 3 n8n export
fixtures/                        Workshop 3 sample tickets (reference)
lib/run.mjs                      runs query(), renders events and routes priorities
lib/chat.mjs                     interactive chat with optional session memory
lib/switch.mjs                   the low / medium / high action and team routes
01-single-agent/                 Step 1: options.mjs, priority-schema.mjs + claude-project/CLAUDE.md
02-subagents/                    Step 2: options.mjs, ticket-schema.mjs, agents.mjs, output/
.claude/agents/                  Step 2–3: risk-agent, customer-reply-agent, customer-context-agent
03-mcp/                          Step 3: read-only transaction/customer MCP servers
.mcp.json                        Step 3: the same MCP server for Claude Code
check.mjs, labels.template.json  Step 4: the label check
05-build-your-own/               Step 5 starter on step-4
lib/backend.mjs                  backend selection and Claude Code argument translation
docs/SETUP.md                    Windows, WSL, Linux/macOS, and Docker setup
```

Files for Step 2 and later appear when you build them (or check out the step branch).

## n8n → Agent SDK

Workshop 3 was Maarten's node-by-node n8n build: Ticket Input → Switch, a Chat
Message trigger, Simple Memory (the favorite-colour test), an AI Agent with a
Structured Output Parser, three sub agents (Customer Reply, Risk, Customer Context)
and a Data Table imported from `docs/customer_context.csv`. Every one of those
nodes has a place in code:

| n8n (Workshop 3) | Agent SDK (today) | Step |
| --- | --- | --- |
| Execute workflow / Chat Message trigger | `npm run lessonN -- MSG-0N` or `npm run chat`: input becomes the `prompt` of `query()` | 0 |
| AI Agent node + OpenAI Chat Model | `query({ prompt, options })` in `lib/run.mjs` | 1 |
| System Message | `CLAUDE.md`, loaded by `settingSources: ['project']` | 1 |
| Max Iterations | `maxTurns` | 1 |
| Simple Memory | `npm run chat` resumes each turn with `resume: sessionId`; `--no-memory` starts each turn fresh | 0 |
| Priority Parser (structured output) | `outputFormat: { type: 'json_schema', schema }` | 1 |
| Risk Agent / Customer Reply Agent | `risk-agent` / `customer-reply-agent` in `options.agents` + the `Agent` tool | 2 |
| Sub agent settings: Description vs System Message | `.claude/agents/<name>.md`: frontmatter `description` (when to delegate) vs body (the subagent's prompt) | 2 |
| Customer Context Agent + Data Table (`Get row(s) in Data table`) | `customer-context-agent` plus MCP `get_customer` over `docs/customer_context.csv` | 3 |
| Transaction lookup | MCP `get_transaction` over `docs/transactions.xlsx` | 3 |
| Switch on low / medium / high | `lib/switch.mjs` maps the priority to its action and team | 0 |
| Human review | A person reviews every reply draft before it is sent | 2–3 |
| Assignment: chat in → whole flow → chat out | `npm run chat -- --lesson 3` or Claude Code with `.mcp.json` and `.claude/agents/` | Stretch |

Hooks (`options.hooks`) and skills (`SKILL.md`) are concepts in the slides; they are
not part of the exercise. `n8n/support-triage.json` is the final Workshop 3 flow;
`docs/n8n-flow-diagram.html` draws it.

## Safety

All data is fictional. Customer text is data, never an instruction. Nothing is
sent to a customer automatically: every reply is a draft that a person reviews.
The transaction MCP tools are read-only and the workbook is never modified.
A passing label check does not replace human review of a draft.

## Earlier version

The previous version of this repo (a TypeScript n8n-parity triage agent with
markdown memory and an HTML course) is kept on the branch
`pre-restructure-2026-10-08`.
