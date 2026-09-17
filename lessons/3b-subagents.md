# Lesson 3b · Tools — two specialist subagents

> ⏱ 15 min · start `step-3a-build-prompt` · solution `step-3b-build-tools` · next: [Lesson 3c](3c-memory.md)

In n8n the AI Agent had two *AI Agent Tool* nodes: **Customer Reply Agent**
and **Risk Agent** — each a small agent with its own system message. The
Agent SDK has exactly that: the built-in **`Agent`** tool plus
**subagent definitions** in `options.agents`.

**What you'll do:**

1. Define the two subagents
2. Give the coordinator only the `Agent` tool
3. Read the trace: who was called, and what did they say?

## Steps

1. **Copy the starter**

   ```bash
   cp starter/src/tools.ts src/tools.ts
   ```

2. **Define the subagents** — `src/tools.ts`

   ```ts
   import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

   export const createSpecialistAgents = (model = "inherit"): Record<SpecialistName, AgentDefinition> => ({
     "customer-reply": {
       description: "Customer Reply Agent: drafts a short, friendly customer reply. Call exactly once …",
       prompt: CUSTOMER_REPLY_SYSTEM,   // the subagent's system message
       tools: [],                       // it can only write text
       model,
       background: false,               // the coordinator waits for the answer
     },
     risk: { description: "Risk Agent: …", prompt: RISK_SYSTEM, tools: [], model, background: false },
   });
   ```

3. **Wire them into `query()`** — `src/agent.ts`

   ```ts
   options: {
     systemPrompt: COORDINATOR_SYSTEM,
     tools: ["Agent"],                 // the coordinator's ONLY built-in tool
     allowedTools: ["Agent"],          // pre-approved
     agents: createSpecialistAgents(), // what the Agent tool may start
     // … outputFormat, permissionMode, settingSources, maxTurns: 8
   }
   ```

   Ask Claude Code:

   ```text
   Complete src/tools.ts (descriptions, tools: [], background: false). In
   src/agent.ts pass tools/allowedTools ["Agent"] and agents. Build the trace
   with extractTrace(): top-level tool_use blocks named Agent (or Task) map
   to input.subagent_type; their tool_result text is the output; ignore
   StructuredOutput and messages with a parent_tool_use_id. Fail unless each
   subagent was called exactly once, and copy risk_note / customer_reply
   from the trace. Run the offline triage, then AGENT_MODEL=sonnet.
   ```

## Run your agent

```bash
npm run triage -- fixtures/ticket.json --dry-run
AGENT_MODEL=sonnet npm run triage -- fixtures/ticket.json --dry-run
```

Expected stream:

```text
Tool: Agent → customer-reply
Tool: Agent → risk
Tool: StructuredOutput
Done: success
```

## How many turns does it take now?

Calling subagents costs turns: one turn in which the coordinator asks both
specialists (both `Agent` calls in one go), and one in which it answers.
Find the smallest budget that still works:

```bash
for n in 1 2 8; do
  AGENT_MODEL=sonnet npm run triage -- fixtures/ticket.json --dry-run --max-turns $n | grep -E "Done|loop"
done
```

What we measured on 17 September:

| `--max-turns` | Result | `num_turns` reported |
| --- | --- | --- |
| 1 | `error_max_turns` — both subagents were called, no answer | 2 |
| 2 | `success` | 4 |
| 8 (default) | `success` | 4 |

So the coordinator needs **2** turns; the default of **8** leaves slack for a
retry without letting a confused run loop forever. Your numbers may differ —
the model decides how many tools to call per turn.

**Subagents have their own budget.** Each `AgentDefinition` takes a
`maxTurns` too. Our specialists have no tools and only write text, so
`SPECIALIST_MAX_TURNS = 2` keeps them from wandering:

```ts
risk: { description: "Risk Agent: …", prompt: RISK_SYSTEM, tools: [], maxTurns: 2, model, background: false },
```

Offline, the fake mirrors these numbers, so the room can see
`--max-turns 1` fail without a key:

```bash
npm run triage -- fixtures/ticket.json --dry-run --max-turns 1
```

## Check your work

- [ ] The trace shows `customer-reply` and `risk` exactly once.
- [ ] `risk_note` in the draft equals the risk subagent output **verbatim**.
- [ ] The subagents have `tools: []` — they cannot act, only write.
- [ ] You know the smallest `--max-turns` that works for your agent, and why the default is higher.

## What the first live run taught us

In our facilitator run the coordinator's structured `risk_note` was a
**shortened paraphrase** of what the Risk subagent returned
([`docs/examples/live-run-wl-1026.json`](../docs/examples/live-run-wl-1026.json)).
That is why the agent copies it from the trace — preservation by construction.

## Compare

```bash
git diff step-3a-build-prompt step-3b-build-tools -- src
```

Also compare `src/tools.ts` with `.claude/agents/risk.md` (added in Lesson 5):
the same subagent, once in code and once as a Claude Code file.

## Key concepts

| n8n | Claude Agent SDK |
| --- | --- |
| AI Agent Tool node | entry in `options.agents` |
| tool description | `description` — tells the coordinator **when** |
| tool system message | `prompt` |
| tool call | `Agent({ subagent_type: "risk", prompt })` |
| `ai_tool` wire | `tools: ["Agent"]` + `allowedTools` |
| Max Iterations | `options.maxTurns` (coordinator) + `maxTurns` per subagent |

## Next lesson

[Lesson 3c · Memory — a markdown file per ticket](3c-memory.md)
