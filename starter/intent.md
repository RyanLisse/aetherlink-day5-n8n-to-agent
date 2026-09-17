# Intent — TEMPLATE (fill from n8n/support-triage.json)

Status: `DRAFT — Plan step`

> Tag every line with the n8n node it came from `[n8n: <node>]`, or `[gap]`
> when the n8n flow does not say it.

## Outcome (WHAT)

- TODO: what does a finished run produce, in plain words? `[n8n: AI Agent prompt · Switch]`

## Why (WHY)

- TODO: who benefits, and why rebuild the flow as code? `[gap]`

## Input

```json
TODO: copy from the "Ticket Input" node
```

## Success checks

1. TODO: identity — which field must survive unchanged? `[gap]`
2. TODO: specialists — which tools, how often? `[n8n: system message]`
3. TODO: routing — priority → action mapping (spelling!) `[n8n: Switch · Set nodes]`
4. TODO: risk — where does `risk_note` come from? `[n8n: Risk Agent]`
5. TODO: human gate — which flags? `[gap]`
6. TODO: what must FAIL instead of being repaired? `[n8n: Code in JavaScript]`
7. TODO: memory — key and format? `[n8n: Simple Memory ×3]`

## Boundaries (non-goals and stop rules)

- In scope: TODO
- Out of scope: TODO (send? refund? remote writes? real data?)
- Stop when: TODO

## The four agent fundamentals

| Fundamental | n8n (source) | This intent says | Code (target) |
| --- | --- | --- | --- |
| System message | TODO | TODO | `src/prompts.ts` |
| Prompt | TODO | TODO | `src/prompts.ts` |
| Tools | TODO | TODO | `src/tools.ts` |
| Memory | TODO | TODO | `src/memory.ts` |

## Owners

| Role | Name | Responsibility |
| --- | --- | --- |
| Human operator | TODO | |
| Agent operator | TODO | |
| Reviewer | TODO | |
| Evidence owner | TODO | |

## OPEN questions

- TODO
