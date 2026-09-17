# Lesson 6 · Maintain — close the loop

> ⏱ 20 min · start `step-5-deploy` · solution `step-6-maintain` · back to: [Lesson 1](1-plan.md)

**What you'll do:**

1. Record today's runs in `progress.md`
2. Turn one validated lesson into a line in `memory/MEMORY.md`
3. See the agent read that lesson on its next run

## Steps

1. **Update the board**

   ```text
   Update progress.md: mark each SDLC row, add one run-log row per run today
   (branch/commit, input, runtime/model, command, checker, trace counts,
   cost, reviewer, OPEN). Propose at most one lesson for memory/MEMORY.md and
   one change to intent.md, each backed by a trace or checker line. Keep
   unvalidated items OPEN. Do not change src/.
   ```

2. **Add a team lesson** — only if a trace or checker showed it:

   ```md
   - Copy `risk_note` and `customer_reply` from the subagent trace; the coordinator's structured output shortened the risk note. (source: 2026-09-17 facilitator live run)
   ```

3. **Close the loop**

   ```bash
   npm run triage -- fixtures/ticket.json --dry-run
   ```

   The lesson is now part of the `<memory>` block in the prompt.

## Check your work

- [ ] Every run of today is in the run log, with the runtime that actually ran.
- [ ] `memory/MEMORY.md` only contains lessons with evidence.

## Close

Made / Learned / Can do. If nothing was validated, write
`NONE — no validated learning yet`.

## Where to go next

- [Configure your agent](https://code.claude.com/docs/en/agent-sdk/configuration)
- [Permissions](https://code.claude.com/docs/en/agent-sdk/permissions)
- [Hooks](https://code.claude.com/docs/en/agent-sdk/hooks) — e.g. block any tool except `Agent`
- [Sessions](https://code.claude.com/docs/en/agent-sdk/sessions)
- [MCP servers](https://code.claude.com/docs/en/agent-sdk/mcp) — connect the real ticket system (read-only first)
- [Example agents](https://github.com/anthropics/claude-agent-sdk-demos)
