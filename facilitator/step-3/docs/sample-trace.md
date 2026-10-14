# Illustrative sample trace

This hand-written trace shows the labels used by `lib/run.mjs`. It is illustrative, not model evidence.

```text
backend: claude-code (claude -p)
[system:init] model sonnet · tools Read, Write · MCP none
[assistant] I will check the message against the priority definitions.
[tool_use] Read
[tool_result] # Customer Support Triage ...
[assistant] The message is a general receipt question with no payment risk.
[result] success · 2 turns · 3400 ms · $0.001
Structured output:
{
  "priority": "low",
  "reason": "The customer needs help finding a receipt."
}
Switch → low → AUTO_REPLY (Self-service support)
```

Claude Code prints these events while it runs. A dry run prints the equivalent command but does not call a model.

## MSG-10 · illustrative missing-information sample

This hand-written example illustrates the live-only path; it is not model evidence.

```text
[tool_use] Agent → risk-agent
[assistant] Missing information: payment date, amount, payment method, and the error shown.
[tool_use] Agent → customer-reply-agent
[assistant] Draft: Could you share the payment date and amount, the payment method, and any error message?
```
