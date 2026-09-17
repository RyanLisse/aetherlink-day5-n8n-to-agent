# Lesson 1 · Plan — from n8n to `intent.md`

> ⏱ 20 min · start `main` · solution `step-1-plan` · next: [Lesson 2](2-design.md)

**What you'll do:**

1. Read every n8n node and write what it **promises** and what it **forgets**
2. Turn that into `intent.md`: outcome, input, success checks, boundaries
3. Start `progress.md`, the current-state board for the day

No code yet. The intent is what every later prompt and test points back to.

## Steps

1. **Copy the starters**

   ```bash
   cp starter/intent.md intent.md
   cp starter/progress.md progress.md
   ```

2. **Ask Claude Code to draft it with you**

   ```text
   Read n8n/support-triage.json and lessons/0-source.md. Fill intent.md from
   starter/intent.md: for every n8n node, write what it promises as a success
   check and what it forgets as a [gap]. Include input, outcome, why,
   boundaries, stop rules, owners and OPEN questions. Do not write code.
   ```

3. **Make it yours** — every line gets a tag: `[n8n: <node>]` or `[gap]`.
   Fill in your name as operator and a colleague as reviewer.

## Check your work

- [ ] Scope is one synthetic ticket; every action is a draft for a human.
- [ ] The five gaps from Lesson 0 appear as `[gap]` success checks.
- [ ] The four fundamentals table names the n8n node for system message, prompt, tools and memory.

## Compare

```bash
git diff work/<your-name> step-1-plan -- intent.md
```

## Key concepts

**Translate, don't copy.** A box in n8n is an implicit promise. Writing it
down as a success check makes it testable; writing the gap down makes it
fixable.

## Next lesson

[Lesson 2 · Design — the contract, tests first](2-design.md)
