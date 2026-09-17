# Lesson 4 · Test — scripted runs and the human review

> ⏱ 35 min · start `step-3c-build-memory` · solution `step-4-test` · next: [Lesson 5](5-deploy.md)

**What you'll do:**

1. Test the agent loop with scripted `query` streams — no key, no network
2. Validate a saved draft with the checker
3. Review the content as a human

## Steps

1. **Copy the starter**

   ```bash
   cp starter/test/agent.test.ts test/agent.test.ts
   npm test
   ```

2. **Turn every `todo` into a test** — the trick: `runTriage` takes `query`
   as a parameter, so a test can hand it a fake stream of SDK-shaped messages.

   ```ts
   const scripted = (events: AgentEvent[]): QueryFn =>
     async function* () { yield* events; };

   // a coordinator that skips the subagents must FAIL
   const run = await runTriage(ticket, { ...deps, query: scripted([success]) });
   assert.equal(run.result.ok, false);
   ```

   Ask Claude Code:

   ```text
   Complete test/agent.test.ts with node:test and scripted QueryFn fakes:
   happy path (both subagents once, high→escalate), risk_note copied
   verbatim, the four fundamentals present in the query() options,
   locked-down options (dontAsk, settingSources [], outputFormat), the loop
   budget (maxTurns passed through; too small a budget FAILS with a clear
   message; num_turns is reported), memory
   written only after a pass, a coordinator that skips the subagents FAILS,
   a non-success result FAILS, duplicate/unknown calls are flagged, and the
   adversarial ticket stays a draft. Do not change src/ unless a test shows
   a real bug. Run npm run verify.
   ```

3. **Run the checker on a saved draft**

   ```bash
   npm run triage -- fixtures/ticket.json --out participant-output/wl-1026.json
   npm run check -- --ticket fixtures/ticket.json --decision participant-output/wl-1026.json
   npm run triage -- fixtures/ticket-malformed.json          # must FAIL
   npm run triage -- fixtures/ticket-adversarial.json --dry-run
   ```

   Expected last line:

   ```text
   OPEN: a human must review the draft before any action is taken
   ```

## Human review

Read ticket and draft side by side:

- Reject a reply that says *"I've logged your report"* — nothing was logged.
- Every unsupported fact stays `OPEN`.
- Decide: **accept**, **revise** (change one instruction, rerun, compare) or **OPEN**.

A checker PASS proves shape and routing — never business approval.

## Check your work

- [ ] `npm run verify` is green.
- [ ] You ran one real run (`AGENT_MODEL=sonnet`) and reviewed its content.

## Compare

```bash
git diff step-3c-build-memory step-4-test -- test src
```

## Key concepts

**Ports make agents testable.** The SDK's `query()` is an async iterator of
messages; anything that yields the same shapes can stand in for it.

## Next lesson

[Lesson 5 · Deploy — a colleague can reproduce it](5-deploy.md)
