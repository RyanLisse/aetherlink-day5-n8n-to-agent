# Lesson 5 · Deploy — a colleague can reproduce it

> ⏱ 40 min · start `step-4-test` · solution `step-5-deploy` · next: [Lesson 6](6-maintain.md)

"Deploy" here means a **reproducible local handoff**, not a production
release. See the SDK's [hosting guide](https://code.claude.com/docs/en/agent-sdk/hosting)
for where this could go next.

**What you'll do:**

1. Add CI that runs the same checks as you do
2. Add the same subagents as Claude Code files
3. Hand off to a colleague who reproduces your run

## Steps

1. **CI** — `.github/workflows/ci.yml` runs `npm ci`, `npm run verify` and an
   offline triage + checker on every push. No API key in CI.

2. **The no-code route** — `.claude/agents/customer-reply.md` and
   `.claude/agents/risk.md` hold the same definitions as
   `createSpecialistAgents()`:

   ```md
   ---
   name: risk
   description: Risk Agent. Writes one internal risk_note … Use exactly once per triage.
   tools: Read, Glob, Grep
   model: sonnet
   ---
   You are a payment risk and escalation specialist …
   ```

   Try it in Claude Code:

   ```text
   Follow CLAUDE.md. Act as the support-triage coordinator from
   src/prompts.ts (COORDINATOR_SYSTEM). Read fixtures/ticket.json and
   memory/WL-1026.md. Call the customer-reply and risk subagents exactly
   once each with the full ticket. Return only the contract JSON in chat.
   Do not write files or run commands.
   ```

   Save the accepted preview yourself and run the same checker:

   ```bash
   npm run check -- --ticket fixtures/ticket.json --decision participant-output/wl-1026-claude.json
   ```

3. **Handoff**

   ```bash
   cp templates/handoff.md participant-output/handoff-day-5.md
   ```

   Fill in: branch + commit, input, exact commands, runtime/model, trace,
   checker line, memory file, reviewer decision, OPEN items. A colleague
   follows it for 10 minutes from a clean `npm ci` and reports
   `reproduced`, `partially reproduced` or `blocked`.

## Check your work

- [ ] The colleague reproduced it from a clean checkout.
- [ ] No key or real customer data is in the handoff or the repo.

## Compare

```bash
git diff step-4-test step-5-deploy
```

## Key concepts

**One definition, two runtimes.** A subagent is a description, a system
prompt, a tool list and a model — in `options.agents` or in
`.claude/agents/*.md`.

## Next lesson

[Lesson 6 · Maintain — close the loop](6-maintain.md)
