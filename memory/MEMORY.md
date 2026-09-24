# Team lessons

Short, validated lessons the agent reads on every run. One line each, with
the evidence that taught it. Keep unvalidated ideas out of this file.

- Never write that a report was "logged", "refunded", "escalated" or "checked": the ticket never contains evidence of it. (source: workshop smoke run, human review)
- Copy `risk_note` and `customer_reply` from the subagent trace; the coordinator's structured output can shorten the risk note. (source: facilitator live run, `docs/examples/live-run-wl-1026.json`)
