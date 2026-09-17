# Team lessons

Short, validated lessons the agent reads on every run. One line each, with
the evidence that taught it. Unvalidated ideas stay in `progress.md` as OPEN.

- Never write that a report was "logged", "refunded", "escalated" or "checked": the ticket never contains evidence of it. (source: Day 5 smoke run, human review rejected "I've logged your report")
- Copy `risk_note` and `customer_reply` from the subagent trace; the coordinator's structured output shortened the risk note. (source: 2026-09-17 facilitator live run, `docs/examples/live-run-wl-1026.json`)
