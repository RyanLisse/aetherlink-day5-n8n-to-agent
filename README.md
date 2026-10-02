# Rebuild an n8n triage agent on the Claude Agent SDK

In Workshop 3 you built a support-triage flow in n8n. In this project you
rebuild the same flow as a TypeScript agent on the
[Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-typescript).
The agent gives each ticket a priority (`low`, `medium` or `high`), asks two
specialist subagents for a reply draft and a risk note, and returns a draft
that a person must review.

You can do the whole project offline. The offline runtime is a scripted fake,
so it needs no API key and costs nothing. Its output is not model evidence.

This is an optional parity bonus for AetherLink Academy Workshop 4, not a
required Workshop 4 lesson. Its fixtures are separate from Workshop 4's
required customer messages and transaction workbook; the required lessons
live in `training-lab/w4-support-agent-sdk` in the Academy repository.

Follow **[SOLO.md](SOLO.md)** for the step-by-step exercise. This README is
the reference: setup, commands, and where things are.

## Prerequisites

- Node.js 22 or later (Node 24 LTS recommended). npm comes with Node.
- Git.
- A terminal: Terminal on macOS or Linux, PowerShell or Command Prompt on
  Windows.

The commands below work the same in all of these terminals, unless a section
shows separate variants.

## Set up

```text
git clone https://github.com/RyanLisse/aetherlink-day5-n8n-to-agent.git
cd aetherlink-day5-n8n-to-agent
npm install
npm run verify
```

`npm run verify` runs the type check, the tests and the self-check. It ends
with:

```text
PASS self-check: 3 valid routes, 7 rejection cases
OPEN: a human must review the draft before any action is taken
```

## Run the agent offline

```text
npm run triage -- fixtures/ticket.json --dry-run
```

The run ends with the routed draft and:

```text
PASS contract · OPEN: a human must review this draft before any action.
```

`--dry-run` means the run does not append to `memory/`. Leave it out when you
want the agent to write a memory note for the ticket.

## Run the agent with a real model (optional)

A real run needs an Anthropic API key. Set the key in the terminal where you
run the command. Never put it in a file, a prompt or a commit.

macOS or Linux:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Windows PowerShell:

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

Windows Command Prompt:

```cmd
set ANTHROPIC_API_KEY=sk-ant-...
```

Then choose a model with `--model`:

```text
npm run triage -- fixtures/ticket.json --dry-run --model sonnet
```

Valid values are `sonnet`, `opus`, `haiku` or a full model ID. The default is
`offline`. A run costs a few cents. If the output says `Not logged in`, the key
is not set in this terminal.

You can also set the `AGENT_MODEL` environment variable instead of `--model`.

## Check a saved draft

```text
npm run triage -- fixtures/ticket.json --dry-run --out participant-output/wl-1026.json
npm run check -- --ticket fixtures/ticket.json --decision participant-output/wl-1026.json
```

The checker confirms the shape, the ticket ID and the route. A PASS is never
business approval.

## The four fundamentals

| Fundamental | n8n | Claude Agent SDK |
| --- | --- | --- |
| System message | AI Agent → System Message | `options.systemPrompt` |
| Prompt | AI Agent → Prompt `{{ $json.… }}` | `prompt` |
| Tools | Customer Reply Agent, Risk Agent | `options.tools: ["Agent"]` + `options.agents` |
| Memory | Simple Memory (static keys) | `memory/*.md` rendered into `prompt` |

```ts
for await (const message of query({
  prompt: `${buildTriagePrompt(ticket)}\n\n${renderMemory(memory)}`,
  options: {
    systemPrompt: COORDINATOR_SYSTEM,
    tools: ["Agent"], allowedTools: ["Agent"],
    agents: createSpecialistAgents(),
    outputFormat: { type: "json_schema", schema: DECISION_SCHEMA },
    permissionMode: "dontAsk", settingSources: [],
    maxTurns: 8,
  },
})) { /* stream → trace → validate → route → memory */ }
```

Side by side: [`docs/fundamentals.md`](docs/fundamentals.md). Example of a real
run: [`docs/examples/live-run-wl-1026.json`](docs/examples/live-run-wl-1026.json).

## Files

```text
SOLO.md                         step-by-step exercise
n8n/support-triage.json         the n8n source flow (sanitized export)
fixtures/                       WL-1026, WL-1027, adversarial, malformed
fixtures/expected-labels.json   expected priorities, shared with Workshop 3
src/prompts.ts                  system message and prompt
src/tools.ts                    Reply and Risk subagents
src/memory.ts                   markdown memory
src/agent.ts                    query() loop and maxTurns
src/runtime.ts                  real SDK or offline fake
src/cli.ts                      npm run triage
src/contract.ts, src/router.ts  types, schema, routes, checks
src/check.ts                    shape and routing checker
memory/MEMORY.md                team lessons the agent reads
.claude/agents/                 the same specialists as Claude Code files
test/                           node:test suites
course/                         interactive HTML course
```

## Safety

All data is fictional. Nothing is sent, refunded, escalated, or written to n8n,
GitHub or a CRM. The coordinator can only use the `Agent` tool; the specialists
have no tools. Every result has `draft_only: true` and
`human_approval_required: true`.

## Interactive course

`course/index.html` is a self-contained course in five modules. It follows
ticket WL-1026 through the n8n flow and through this agent. Open the file in
your browser; double-clicking it in your file explorer works on every system.

After you edit `course/modules/*.html`, rebuild and check the page:

```text
npm run course:build
npm run course:check
```

## Related

- [Claude Agent SDK (TypeScript)](https://github.com/anthropics/claude-agent-sdk-typescript) and its [quickstart](https://code.claude.com/docs/en/agent-sdk/quickstart)
- Workshop 3 uses the same tickets and the same `low` / `medium` / `high` labels.
