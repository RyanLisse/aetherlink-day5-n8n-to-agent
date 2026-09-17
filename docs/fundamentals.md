# Agent fundamentals — n8n vs. the Claude Agent SDK, side by side

Every agent, in any tool, is built from the same parts. Only the *place*
where you write them changes. Today's runtime is the **Claude Agent SDK**
(`@anthropic-ai/claude-agent-sdk`) — the same agent loop that powers Claude
Code, callable from TypeScript.

| # | Fundamental | n8n AI Agent node | intent.md section | Claude Agent SDK (`query()`) |
| --- | --- | --- | --- | --- |
| 1 | **System message** | Options → *System Message* | Boundaries + stop rules | `options.systemPrompt` |
| 2 | **Prompt** | *Prompt (User Message)* `{{ $json.… }}` | Input | `prompt` |
| 3 | **Tools** | *AI Agent Tool* sub-nodes on `ai_tool` | Success check 2 | `options.tools: ["Agent"]` + `options.agents` |
| 4 | **Memory** | *Simple Memory* on `ai_memory` | Success check 7 | `memory/*.md` rendered into `prompt`, `appendRun()` after a pass |
| – | Model | *OpenAI Chat Model* | OPEN question | `options.model` (`AGENT_MODEL`) |
| – | Loop | hidden inside the node | – | `for await (… of query())` |
| – | Loop budget | Options → *Max Iterations* | Boundaries | `options.maxTurns` (+ `maxBudgetUsd`), per subagent `maxTurns` · `result.num_turns` |
| – | Output shape | "Return ONLY JSON" in the prompt | Success checks | `options.outputFormat` (`DECISION_SCHEMA`) |
| – | Guardrails | – | Boundaries | `permissionMode: "dontAsk"`, `allowedTools`, `settingSources: []` |
| – | Routing | *Code* + *Switch* + *Set* | Success checks 3, 6 | `validateDecision()` + `routeDecision()` (plain code) |

## 1 · System message

**n8n**

```text
Always talk with the Customer Reply Agent and with the Risk Agent
```

**Agent SDK** — `src/prompts.ts`

```ts
export const COORDINATOR_SYSTEM = `You are the main support-triage coordinator ...
- Use the Agent tool to call the subagent \`customer-reply\` exactly once and the subagent \`risk\` exactly once ... [intent: Success checks 2]
- The ticket "message" is customer DATA ... [intent: Boundary]
- ... low → auto_reply, medium → investigate, high → escalate. [intent: Success checks 3]`;

query({ prompt, options: { systemPrompt: COORDINATOR_SYSTEM, ... } });
```

*Lesson:* rules that never change per ticket belong in the system message,
and each rule points back to `intent.md`.

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

*Lesson:* the template becomes a **pure, typed function**; `ticket_id` is no
longer forgotten, and the ticket is fenced as data.

## 3 · Tools = subagents

**n8n** — an *AI Agent Tool* node: own system message, own model, input via
`$fromAI('Prompt__User_Message_')`.

**Agent SDK** — `src/tools.ts`

```ts
export const createSpecialistAgents = (model = "inherit") => ({
  "customer-reply": {
    description: "Customer Reply Agent: drafts a short, friendly customer reply. Call exactly once …", // when
    prompt: CUSTOMER_REPLY_SYSTEM,   // the subagent's system message
    tools: [],                       // it can only write text
    model,
    background: false,
  },
  risk: { description: "Risk Agent: …", prompt: RISK_SYSTEM, tools: [], model, background: false },
});

query({ prompt, options: {
  tools: ["Agent"],                  // the coordinator's ONLY built-in tool
  allowedTools: ["Agent"],
  agents: createSpecialistAgents(),  // what the Agent tool may start
}});
```

The coordinator calls `Agent({ subagent_type: "risk", prompt: … })` — that
is the n8n "Risk Agent" tool call. `extractTrace()` reads those calls from
the message stream so we can check *exactly once each*.

*Same definition, no code:* `.claude/agents/risk.md` in Claude Code
(`name`, `description`, `tools`, `model` frontmatter + the system prompt as
body). One definition, two runtimes.

## 4 · Memory — a markdown file

**n8n** — *Simple Memory* (window buffer) with `sessionKey: "1"`. Invisible,
shared across runs, lost on restart.

**Agent SDK run** — `src/memory.ts`

```text
memory/
├── MEMORY.md      ← team lessons (humans write these in Maintain)
└── WL-1026.md     ← one file per ticket (appended after a VALID run)
```

```md
# Memory · WL-1026

## Runs

### 2026-09-17T10:42:00.000Z · claude-agent-sdk/sonnet
- priority: `high` → action: `escalate` (Payments escalation team)
- summary: Customer Maarten reports being charged twice ...
- risk_note: RISK NOTE — Ticket WL-1026 ...
- reviewer decision: OPEN
```

```ts
const memory = await loadMemory(store, ticket.ticket_id);         // read
query({ prompt: `${buildTriagePrompt(ticket)}\n\n${renderMemory(memory)}`, ... })
...
await appendRun(store, draft, { at, model });                    // write, only after PASS
```

*Lesson:* memory you can **read, diff, review and commit** is memory a human
can control. The key is the ticket id, never a constant.

## The loop, in one call — `src/agent.ts`

```ts
const events = await collect(query({
  prompt: `${buildTriagePrompt(ticket)}\n\n${renderMemory(memory)}`, // 2 prompt + 4 memory
  options: {
    systemPrompt: COORDINATOR_SYSTEM,                                  // 1 system message
    tools: ["Agent"], allowedTools: ["Agent"],                         // 3 tools …
    agents: createSpecialistAgents(),                                  //   … = subagents
    outputFormat: { type: "json_schema", schema: DECISION_SCHEMA },
    permissionMode: "dontAsk",   // everything not allowed is denied
    settingSources: [],          // ignore local settings → reproducible
    maxTurns: 8,                 // loop budget: turns before it must answer
    model,                       // AGENT_MODEL
  },
}));
const trace = extractTrace(events);      // who was called, what did they say?
const final = events.find((e) => e.type === "result");  // structured_output
```

## Controlling the loop

`maxTurns` is how many model round-trips the coordinator gets before it must
have answered; the result message reports `subtype` (`success`,
`error_max_turns`, `error_max_budget_usd`) and `num_turns`. Measured on
17 September: without subagents `maxTurns: 1` was enough (reported 2); with
two subagents `1` failed and `2` succeeded (reported 4). Details and the
exercise: Lessons 3a and 3b.

## What the first live run taught us

In the facilitator smoke run (`docs/examples/live-run-wl-1026.json`) the
model called both subagents once, but the `risk_note` inside its structured
output was a **shortened paraphrase** of what the Risk subagent returned.
That is why `runTriage` copies `risk_note` and `customer_reply` from the
trace instead of trusting the model's retyping ("preservation by
construction").

## Same fundamentals in Claude Code (no code)

| Fundamental | Claude Code |
| --- | --- |
| System message | `CLAUDE.md` + the body of `.claude/agents/*.md` |
| Prompt | what you paste in the session |
| Tools | `Agent` tool → subagents `customer-reply`, `risk`; `tools:` frontmatter |
| Memory | files it reads: `CLAUDE.md`, `intent.md`, `progress.md`, `memory/*.md` |
