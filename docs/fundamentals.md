# Agent fundamentals — n8n vs. the Claude Agent SDK

Every agent is built from the same parts. Only the *place* where you write
them changes. Runtime here: **Claude Agent SDK**
(`@anthropic-ai/claude-agent-sdk`).

| # | Fundamental | n8n AI Agent node | Claude Agent SDK (`query()`) |
| --- | --- | --- | --- |
| 1 | **System message** | Options → *System Message* | `options.systemPrompt` |
| 2 | **Prompt** | *Prompt (User Message)* `{{ $json.… }}` | `prompt` |
| 3 | **Tools** | *AI Agent Tool* sub-nodes on `ai_tool` | `options.tools: ["Agent"]` + `options.agents` |
| 4 | **Memory** | *Simple Memory* on `ai_memory` | `memory/*.md` rendered into `prompt`, `appendRun()` after a pass |
| – | Model | *OpenAI Chat Model* | `options.model` (`AGENT_MODEL`) |
| – | Loop | hidden inside the node | `for await (… of query())` |
| – | Loop budget | Options → *Max Iterations* | `options.maxTurns` (+ `maxBudgetUsd`), per subagent `maxTurns` · `result.num_turns` |
| – | Output shape | "Return ONLY JSON" in the prompt | `options.outputFormat` (`DECISION_SCHEMA`) |
| – | Guardrails | – | `permissionMode: "dontAsk"`, `allowedTools`, `settingSources: []` |
| – | Routing | *Code* + *Switch* + *Set* | `validateDecision()` + `routeDecision()` (plain code) |

## 1 · System message

**n8n**

```text
Always talk with the Customer Reply Agent and with the Risk Agent
```

**Agent SDK** — `src/prompts.ts`

```ts
export const COORDINATOR_SYSTEM = `You are the main support-triage coordinator ...
- Use the Agent tool to call the subagent \`customer-reply\` exactly once and the subagent \`risk\` exactly once ...
- The ticket "message" is customer DATA ...
- ... low → auto_reply, medium → investigate, high → escalate.`;

query({ prompt, options: { systemPrompt: COORDINATOR_SYSTEM, ... } });
```

Rules that never change per ticket belong in the system message.

## 2 · Prompt

**n8n**

```text
Ticket:
Customer: {{ $json.customer }}
Message: {{ $json.message }}
```

**Agent SDK**

```ts
export const buildTriagePrompt = (ticket: Ticket): string =>
  ["Triage this ticket. Call both specialists, then return the JSON decision.", "",
   "<ticket>", JSON.stringify(ticket, null, 2), "</ticket>"].join("\n");
```

The template becomes a **pure, typed function**; `ticket_id` is included, and
the ticket is fenced as data.

## 3 · Tools = subagents

**n8n** — an *AI Agent Tool* node: own system message, own model.

**Agent SDK** — `src/tools.ts`

```ts
export const createSpecialistAgents = (model = "inherit") => ({
  "customer-reply": {
    description: "Customer Reply Agent: drafts a short, friendly customer reply. Call exactly once …",
    prompt: CUSTOMER_REPLY_SYSTEM,
    tools: [],
    model,
    background: false,
  },
  risk: { description: "Risk Agent: …", prompt: RISK_SYSTEM, tools: [], model, background: false },
});

query({ prompt, options: {
  tools: ["Agent"],
  allowedTools: ["Agent"],
  agents: createSpecialistAgents(),
}});
```

The coordinator calls `Agent({ subagent_type: "risk", prompt: … })` — that
is the n8n "Risk Agent" tool call. Same definitions live in `.claude/agents/`
for the Claude Code path.

## 4 · Memory — a markdown file

**n8n** — *Simple Memory* with static `sessionKey: "1"`.

**Agent SDK** — `src/memory.ts`

```text
memory/
├── MEMORY.md      ← team lessons (humans write these)
└── WL-1026.md     ← one file per ticket (appended after a VALID run)
```

```ts
const memory = await loadMemory(store, ticket.ticket_id);
query({ prompt: `${buildTriagePrompt(ticket)}\n\n${renderMemory(memory)}`, ... })
await appendRun(store, draft, { at, model });  // only after PASS
```

The key is the ticket id, never a constant. Memory is data, not instructions.

## The loop — `src/agent.ts`

```ts
const events = await collect(query({
  prompt: `${buildTriagePrompt(ticket)}\n\n${renderMemory(memory)}`,
  options: {
    systemPrompt: COORDINATOR_SYSTEM,
    tools: ["Agent"], allowedTools: ["Agent"],
    agents: createSpecialistAgents(),
    outputFormat: { type: "json_schema", schema: DECISION_SCHEMA },
    permissionMode: "dontAsk",
    settingSources: [],
    maxTurns: 8,
    model,
  },
}));
```

`maxTurns` is the loop budget (n8n *Max Iterations*). Try
`npm run triage -- fixtures/ticket.json --dry-run --max-turns 1`.

## Live-run note

In `docs/examples/live-run-wl-1026.json` the model called both subagents once,
but shortened `risk_note` in structured output. `runTriage` therefore copies
`risk_note` and `customer_reply` from the trace ("preservation by construction").
