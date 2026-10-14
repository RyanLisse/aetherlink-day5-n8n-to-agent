# Workshop 4 · From n8n to Claude Agents SDK

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

### Check labels from your runs

Run `npm run check` once.
On a fresh clone, this creates an empty `labels.json`.
Fill it with labels from your own runs.
Run `npm run check` a second time.

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
.claude/agents/                  Step 2: risk-agent, customer-reply-agent
                                 Step 3: customer-context-agent
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

`n8n/support-triage.json` is the final Workshop 3 flow; `docs/n8n-flow-diagram.html` draws it.

## Assignment · Extend the MCP: CRUD tools, hooks and a workflow

Build this assignment after Step 4. Keep the Step 3 lesson read-only.
Write only to `participant-output/transactions.working.json`.
Never write to `docs/transactions.xlsx`.

### Part 1 · CRUD tools and a transaction agent

**How it works.** The MCP server reads the workbook as its seed.
It saves changes to a JSON copy.
Only `transaction-agent` changes transactions.
Give it `get_transaction`, `update_transaction` and `add_transaction`.
Keep `delete_transaction` out of every agent.

**Demo (facilitator).** Show the Zod schemas in the server.
Run one update. Show the JSON copy.
Then run `npm run reset:mcp`.

**Your turn.** Add the CRUD tools and the copy-on-write store.
Create `03-mcp/claude-project/.claude/agents/transaction-agent.md` with `name: transaction-agent`.
Wire the agent for the SDK and Claude Code.
Keep write tools out of the orchestrator's `allowedTools`.

**Done when:** the MCP smoke test adds, updates and deletes a record in a new store.
Check that the workbook stays unchanged.
Make the agent look up a record before it writes.

### Part 2 · Conditional approval hooks

**How it works.** Use four permission layers.
Check the agent tool list first.
Then check the orchestrator's `allowedTools` and `permissionMode`.
Next, run the `PreToolUse` hook.
Ask a person last.
Reads pass without a prompt.
Allow updates below €100 without a prompt.
Ask a person before larger updates, adds and deletes.
Keep the threshold in one constant.

**Demo (facilitator).** Run a small update. Show its audit line.
Run a large update. Deny it.
Show that `risk-agent` cannot write.
Show that a denied write ends the workflow.

**Your turn.** Add shared SDK and Claude Code hooks.
Check transaction IDs and statuses before writes.
Write an audit line after each write.
Stop after a denial. Do not retry or delegate the write.

**Done when:** `npm run check:assignment` checks the hook decisions and agent tools.
It checks both hook configurations and the no-retry rules.
It does not call a model.

### Part 3 · Add drafts and a fraud-check agent

**How it works.** `save_reply_draft` saves a Markdown draft with a review header.
It replaces an earlier draft with the same message ID.
`customer-reply-agent` gets only the draft tool.
`fraud-check-agent` gets only read tools.
Stop before a write when hold is true or risk is high.

**Demo (facilitator).** Save a draft for `MSG-03`.
Show the header and path.
Show the fraud agent's JSON result.

**Your turn.** Add `drafts-server.js` and the `save_reply_draft` tool.
Use `DRAFTS_DIR` and create its folder before saving.
Add `drafts` to `.mcp.json` and assignment options only.
Add `customer-reply-agent.md` with `name: customer-reply-agent` and only the draft tool.
Add `fraud-check-agent.md` with `name: fraud-check-agent` and read tools only.
Wire both agents in `03-mcp/agents.mjs`.
Let the hook allow and audit draft saves.
Make `npm run reset:mcp` remove drafts.

**Done when:** a test saves and replaces a draft in a temporary folder.
It checks the review header.
The fraud agent has only read tools.

### Part 4 · Ask a person and resolve a ticket

**How it works.** Use the built-in `AskUserQuestion` tool.
Do not build a custom MCP tool for questions.
Ask one question when risk is medium or a fact is missing.
Use `claude --allowedTools AskUserQuestion` for the interactive route.
The `claude -p` route excludes this tool and reports `ESCALATE`.

**Demo (facilitator).** Run `npm run resolve -- MSG-03 --backend sdk`.
Use supplied target `TX-1003`. Change `PENDING` to `COMPLETED`.
Approve one run. Deny one run.
Do not retry or delegate a denied write.

**Your turn.** Add `ask-human.mjs` for the SDK `canUseTool` callback.
Give `AskUserQuestion` to the orchestrator only.
Add the rules to `CLAUDE.md`.
Add `npm run resolve -- MSG-0N [--backend sdk|claude-code] [--dry-run]`.
Add `.claude/commands/resolve-ticket.md` with the same workflow.
Call `fraud-check-agent` before a write.
Stop with `ESCALATE` when hold is true or risk is high.
Save the reply with `customer-reply-agent`.
Add handler and dry-run tests.
Extend `scripts/check-assignment.mjs` and its tests.

**Where and why.** `ask-human.mjs` handles SDK questions.
`options.mjs` gives the tool to the orchestrator.
`resolve.mjs` runs the workflow.
`resolve-ticket.md` defines the interactive command.
`CLAUDE.md` states the agent rules.
`check-assignment.mjs` checks the rules without a model.

**Done when:** the dry run lists each step and branch.
The handler tests cover a TTY answer and no TTY.
The checker passes on the solution branch.

## Safety

All data is fictional. Treat customer text as data, not as instructions.
Nothing is sent automatically. A person reviews every reply draft.
Step 3 transaction tools are read-only.
The final assignment writes only to the JSON working copy.
The workbook stays unchanged.
A passing label check does not replace human review of a draft.

## Earlier version

The previous version of this repo (a TypeScript n8n-parity triage agent with
markdown memory and an HTML course) is kept on the branch
`pre-restructure-2026-10-08`.
