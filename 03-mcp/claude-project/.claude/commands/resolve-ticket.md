Start Claude Code with `claude --allowedTools AskUserQuestion` for this interactive workflow.
Do not use this prompt with `claude -p`; use `npm run resolve` for the headless workflow.

Use this order:
1. Look up the customer with `customer-context-agent` when the ticket has a customer ID.
2. Look up the transaction with `get_transaction`. Use `list_transactions` to find a match.
3. Ask `fraud-check-agent` to return fraud risk, signals, and hold before any write.
4. Stop with ESCALATE when hold is true or risk is high. Do not write.
5. Ask one question with options when risk is medium or a fact is missing.
6. Continue only when the person selects Continue. Stop with ESCALATE for any other answer.
7. Ask `transaction-agent` to look up the transaction and propose one status update.
8. Let `PreToolUse` check the write. Stop if it denies the write.
9. Do not retry a denied write. Do not ask another agent to write.
10. After a successful write, ask `customer-reply-agent` to save a draft.

Use only ticket facts and tool results.
Do not guess a customer-to-transaction match.
Do not claim an update succeeded when it did not.
