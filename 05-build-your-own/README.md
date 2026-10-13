# Step 5 · Build your own agent

This starter uses the same Claude Agent SDK version as the workshop. To make it a
standalone project, run these commands from this directory:

```sh
npm init -y
npm pkg set type=module
npm install @anthropic-ai/claude-agent-sdk@0.3.281
```

With an `ANTHROPIC_API_KEY`, run `node agent.mjs` to ask the agent to find and fix
the bug in `utils.js`. Without a key, inspect the equivalent command with
`node agent.mjs --dry-run`, or run it with your Claude Code login:

```sh
claude -p "Find and fix the bug in utils.js. Explain the change." --allowedTools Read,Edit,Glob --permission-mode acceptEdits
```

Make it yours: change the prompt, add a `CLAUDE.md` (Step 1), add a subagent
(Step 2), or connect an MCP server (Step 3).
