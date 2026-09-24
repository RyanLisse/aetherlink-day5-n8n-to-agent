# Workshop 4 · rebuild your n8n triage agent on the Claude Agent SDK

**AetherLink Academy · `/workshop/4` · ticket priority L/M/H (same fixture as Workshop 3)**

You built a support-triage flow in n8n. Here you rebuild it as an agent on the
[**Claude Agent SDK**](https://github.com/anthropics/claude-agent-sdk-typescript)
— `systemPrompt` · `prompt` · tools/subagents · markdown memory · `maxTurns`.
Offline/dry-run works without an API key.

Attendee path: **[SOLO.md](SOLO.md)** (SOLO 0 → 4). Pedagogy: Uitleg → Voordoen → Zelf doen.

## Quick start

```bash
git clone https://github.com/RyanLisse/aetherlink-day5-n8n-to-agent.git
cd aetherlink-day5-n8n-to-agent
git switch -c work/<your-name>
npm install                            # Node 20+
npm test                               # includes n8n source pins
npm run triage -- fixtures/ticket.json --dry-run   # offline, no key
```

Deck: Academy **`/workshop/4`** (alias `/lesson/workshop-4`). Do not download ZIPs, credentials, or customer data.

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

Side by side: [`docs/fundamentals.md`](docs/fundamentals.md) ·
example run: [`docs/examples/live-run-wl-1026.json`](docs/examples/live-run-wl-1026.json).

## Layout

```text
SOLO.md                     attendee path (0–4)
n8n/support-triage.json     source flow (sanitized export) — parity SoT
fixtures/                   WL-1026, WL-1027, adversarial, malformed
fixtures/expected-labels.json   shared L/M/H acceptance with Workshop 3
src/prompts.ts              system message + prompt
src/tools.ts                Reply / Risk subagents
src/memory.ts               markdown memory
src/agent.ts                query() loop + maxTurns
src/runtime.ts              SDK or offline fake
src/cli.ts                  npm run triage
src/contract.ts · router.ts types, schema, routes, checks
src/check.ts                shape/routing checker (not business approval)
memory/MEMORY.md            team lessons the agent reads
.claude/agents/             same specialists as Claude Code files
test/                       node:test suites
```

## Runtimes

| `AGENT_MODEL` | Needs | Use |
| --- | --- | --- |
| `offline` (default) | nothing | whole room; scripted, **not model evidence** |
| `sonnet`, `opus`, `haiku`, or a full model id | `ANTHROPIC_API_KEY` in the shell | real SDK run (a few cents) |

The SDK reads the key from the environment and does not load `.env` files.

## Safety

Fictional data only. Nothing is sent, refunded, escalated, or written to n8n,
GitHub, or a CRM. Coordinator may only use the `Agent` tool; specialists have
no tools. Every result has `draft_only: true` and `human_approval_required: true`.
A checker PASS is never business approval. Keys never go into files, prompts, or commits.

## Related

- [Claude Agent SDK (TypeScript)](https://github.com/anthropics/claude-agent-sdk-typescript) · [quickstart](https://code.claude.com/docs/en/agent-sdk/quickstart)
- Academy Workshop 4 deck: `/workshop/4`
- Workshop 3 vehicle / fixture parity (same tickets · same L/M/H labels)
