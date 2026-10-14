Start Claude Code with `claude --allowedTools AskUserQuestion` for this interactive workflow.
Do not use this prompt with `claude -p`; use `npm run resolve` for the headless workflow.

Use this order:
1. Look up the customer with `customer-context-agent` when the ticket has a customer ID.
2. Look up the transaction with `get_transaction`. Use `list_transactions` to find a match.
3. Ask `fraud-check-agent` to return fraud risk, signals, and hold before any write.
4. Stop with ESCALATE when hold is true or risk is high. Do not write.
5. Ask one question with options when risk is medium or a fact is missing.
6. Continue only when the person selects Continue. Stop with ESCALATE for any other answer.
7. Ask `transaction-agent` to look up the transaction and record the ticket in `issue_details`.
8. Keep the current `issue_details` text. Append one claim with this format: ` | MSG-0N (customer report): <one short sentence of what the customer says>`.
9. Treat the added sentence as the only allowed customer claim, not a confirmed fact.
10. Change status only when the ticket and tool results support a new status. Otherwise, keep the current status exactly.
11. Let `PreToolUse` check the write. Stop if it denies the write.
12. Do not retry a denied write. Do not ask another agent to write.
13. After a successful write, ask `customer-reply-agent` to save a draft.
14. Tell `customer-reply-agent` to use only facts from the ticket and tool results.
15. Tell `customer-reply-agent` to state each transaction status exactly as the tool result shows it.
16. Tell `customer-reply-agent` not to say that the team reviews the case unless a tool result confirms it.
17. Tell `customer-reply-agent` not to promise future help unless a tool result confirms it.
18. Tell `customer-reply-agent` not to claim or promise a refund, release, or date.

Use only ticket facts and tool results.
Do not guess a customer-to-transaction match.
Do not claim an update succeeded when it did not.
