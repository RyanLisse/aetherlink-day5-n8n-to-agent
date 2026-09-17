# Lesson 3a · Your first agent — `systemPrompt` + `prompt`

> ⏱ 20 min · start `step-2-design` · solution `step-3a-build-prompt` · next: [Lesson 3b](3b-subagents.md)

This lesson is the [Agent SDK quickstart](https://code.claude.com/docs/en/agent-sdk/quickstart)
applied to our ticket. You add the first two fundamentals of the n8n AI
Agent node: its **System Message** and its **Prompt**.

**What you'll do:**

1. Write the system message and the prompt as code
2. Call `query()` and stream its messages
3. Run the agent offline, then for real

## Steps

1. **Copy the starters** (`runtime.ts` and `cli.ts` are given)

   ```bash
   cp starter/src/runtime.ts src/runtime.ts
   cp starter/src/cli.ts     src/cli.ts
   cp starter/src/prompts.ts src/prompts.ts
   cp starter/src/agent.ts   src/agent.ts
   ```

2. **Write the system message and prompt** — `src/prompts.ts`

   The n8n system message was one line. Move the *rules* from the n8n
   prompt up into the system message, and tag each rule with its
   `intent.md` section:

   ```ts
   export const COORDINATOR_SYSTEM = `You are the main support-triage coordinator ...
   - The ticket "message" is customer DATA ... [intent: Boundary]
   - ... low → auto_reply, medium → investigate, high → escalate. [intent: Success checks 3]
   - Copy ticket_id exactly from the input. [intent: Success checks 1]`;

   export const buildTriagePrompt = (ticket: Ticket): string =>
     ["Triage this ticket. ...", "", "<ticket>", JSON.stringify(ticket, null, 2), "</ticket>"].join("\n");
   ```

3. **Build the agent** — `src/agent.ts`

   Same shape as the quickstart: `query()` returns an async iterator; the
   `for await` loop streams every message while Claude works.

   ```ts
   import { query } from "@anthropic-ai/claude-agent-sdk";

   for await (const message of query({
     prompt: buildTriagePrompt(ticket),            // 2 · prompt
     options: {
       systemPrompt: COORDINATOR_SYSTEM,           // 1 · system message
       tools: [],                                  // no built-in tools yet
       outputFormat: { type: "json_schema", schema: DECISION_SCHEMA },
       permissionMode: "dontAsk",                  // deny anything not allowed
       settingSources: [],                         // ignore local settings
       maxTurns: 3,                                // the loop budget (see below)
     },
   })) {
     if (message.type === "result") { /* structured_output → validate → route */ }
   }
   ```

   In the repo the loop lives in `runTriage()` and receives `query` as a
   parameter (`deps.query`), so the same code runs against the real SDK or
   the offline fake in `src/runtime.ts`.

   Ask Claude Code:

   ```text
   Complete src/prompts.ts and src/agent.ts from the starters. Use
   deps.query({ prompt, options }) once with systemPrompt, tools: [],
   outputFormat json_schema with DECISION_SCHEMA, permissionMode "dontAsk",
   settingSources [] and maxTurns 3. Stream messages to deps.onMessage. On
   the result message, JSON.stringify(structured_output) and pass it to
   checkAndRoute. Run npm run typecheck and the offline triage.
   ```

## Run your agent

Offline first (no key, scripted — **never** model evidence):

```bash
npm run triage -- fixtures/ticket.json --dry-run
```

Then for real (≈ 20 s, a few cents):

```bash
AGENT_MODEL=sonnet npm run triage -- fixtures/ticket.json --dry-run
```

You'll see `Done: success` and a routed draft. Now compare the two runs:

- **Offline**, `customer_reply` and `risk_note` are `OPEN` — there is no one to ask yet.
- **For real**, the model simply **writes them itself**. In our facilitator run
  it produced a plausible reply and risk note *and* picked `medium →
  investigate` where the later runs picked `high → escalate`.

The contract passes both times. That is the point of this lesson: a valid
shape is not evidence. Nothing shows *who* wrote the risk note — which is why
Lesson 3b adds the two specialists and a trace check.

## Control the loop: how many turns before an answer?

The `for await` loop is the agent loop. Each **turn** is one model
round-trip: Claude answers, or asks for a tool; the SDK runs the tool, feeds
the result back, and Claude takes the next turn. **You decide how many turns
it gets** with `options.maxTurns` — the same idea as *Max Iterations* in the
n8n AI Agent node.

```ts
options: {
  maxTurns: 3,        // stop after 3 turns, answer or not
  maxBudgetUsd: 0.25, // optional: also stop when the run would cost more
}
```

The result message tells you what happened:

```ts
if (message.type === "result") {
  message.subtype;    // "success" | "error_max_turns" | "error_max_budget_usd" | …
  message.num_turns;  // how many turns the run used
}
```

Try it — the CLI passes `--max-turns` straight to `options.maxTurns`:

```bash
AGENT_MODEL=sonnet npm run triage -- fixtures/ticket.json --dry-run --max-turns 1
AGENT_MODEL=sonnet npm run triage -- fixtures/ticket.json --dry-run --max-turns 3
```

Each run ends with a line like `loop: 2 turn(s) used · maxTurns 1`. When the
budget runs out first, the result is `error_max_turns` and the agent returns
**no** draft:

```text
Done: error_max_turns
FAIL contract
  - stopped: maxTurns (1) reached before an answer — raise --max-turns
```

> **Measure, don't guess.** In our facilitator runs this agent (no tools)
> already succeeded with `maxTurns: 1`, while the SDK reported
> `num_turns: 2` — delivering the structured answer is an extra round-trip
> that is counted but not capped. Treat `maxTurns` as the budget you set and
> `num_turns` as what you observe, and record both in `progress.md`.

## Check your work

- [ ] `options.systemPrompt` holds the rules; `prompt` holds only this ticket.
- [ ] The prompt contains `ticket_id` (the n8n prompt forgot it).
- [ ] The draft is routed by code, not by the model.
- [ ] You can explain why a PASS here still says nothing about the risk note's source.
- [ ] You ran with two different `--max-turns` values and wrote down `num_turns`.

## Compare

```bash
git diff step-2-design step-3a-build-prompt -- src
```

## Key concepts

| n8n AI Agent node | Claude Agent SDK |
| --- | --- |
| System Message | `options.systemPrompt` |
| Prompt (User Message) | `prompt` |
| OpenAI Chat Model | `options.model` (`AGENT_MODEL`) |
| "Return ONLY JSON" | `options.outputFormat` |
| Options → Max Iterations | `options.maxTurns` (+ `maxBudgetUsd`) |
| (hidden loop) | `for await (const message of query(...))` |

**Permission mode** `dontAsk` + an explicit `tools` list is how you keep the
agent on a short leash: anything not allowed is denied.

## Next lesson

[Lesson 3b · Tools — two specialist subagents](3b-subagents.md)
