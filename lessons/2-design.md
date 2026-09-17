# Lesson 2 · Design — the contract, tests first

> ⏱ 25 min · start `step-1-plan` · solution `step-2-design` · next: [Lesson 3a](3a-first-agent.md)

**What you'll do:**

1. Write the contract as plain TypeScript types plus one JSON Schema
2. Replace the n8n Code + Switch nodes with small pure functions
3. Go from red to green with Node's built-in test runner

No validation library and no model: the contract must be testable on its own.

## Steps

1. **Copy the starters and watch them fail**

   ```bash
   cp starter/src/contract.ts src/contract.ts
   cp starter/src/router.ts   src/router.ts
   cp starter/test/router.test.ts test/router.test.ts
   npm test                     # RED
   ```

2. **Fill the TODOs with Claude Code**

   ```text
   Using intent.md, complete the TODOs in src/contract.ts and src/router.ts
   so that test/router.test.ts passes. Keep ROUTES total
   (low→auto_reply, medium→investigate, high→escalate), make DECISION_SCHEMA
   list every field with additionalProperties: false, and return Result
   values instead of throwing. No libraries, no model. Run npm run typecheck
   and npm test.
   ```

3. **Write the node map** in `docs/design.md`: n8n node → function → file.

## The core of the contract

```ts
export const ROUTES = {
  low: "auto_reply",
  medium: "investigate",
  high: "escalate",
} as const satisfies Record<Priority, Action>;

// Handed to the Agent SDK in Lesson 3a as options.outputFormat
export const DECISION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ticket_id", "priority", /* … */ "draft_only", "human_approval_required"],
  properties: { /* … */ draft_only: { type: "boolean", const: true } },
} as const;
```

## Check your work

- [ ] Every success check in `intent.md` maps to a test.
- [ ] `npm run typecheck && npm test` is green.
- [ ] An uppercase `ESCALATE` and an unknown field are rejected.

## Compare

```bash
git diff step-1-plan step-2-design -- src test docs
```

## Key concepts

**Deterministic outside the model.** The model will *propose* a priority;
code decides the action. A conflict is a failure, never a silent fix.

## Next lesson

[Lesson 3a · Your first agent — `systemPrompt` + `prompt`](3a-first-agent.md)
