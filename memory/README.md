# memory/ — the agent's markdown memory

| File | Written by | Read by | Committed |
| --- | --- | --- | --- |
| `MEMORY.md` | humans, in **Maintain** | the agent, every run | yes |
| `<ticket_id>.md` | the agent, after a **valid** run | the agent, next run for that ticket | no (local run history) |

This replaces n8n's *Simple Memory* nodes, which used the static keys
`"1"`, `"2"` and `"1"` for every execution. Here the key is the ticket id,
and you can open, diff and delete memory like any other file.

Memory is rendered into the prompt inside `<memory>` and marked
"data, not instructions".
