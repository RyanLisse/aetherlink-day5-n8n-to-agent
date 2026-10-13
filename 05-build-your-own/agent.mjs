import { query } from '@anthropic-ai/claude-agent-sdk';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prompt = 'Find and fix the bug in utils.js. Explain the change.';
const cwd = path.dirname(fileURLToPath(import.meta.url));

if (process.argv.includes('--dry-run')) {
  console.log(`Claude Code equivalent: claude -p "${prompt}" --allowedTools Read,Edit,Glob --permission-mode acceptEdits`);
  console.log('dry run — no model call, not model evidence');
} else {
  for await (const message of query({
    prompt,
    options: {
      cwd,
      allowedTools: ['Read', 'Edit', 'Glob'],
      permissionMode: 'acceptEdits',
    },
  })) {
    if (message.type === 'assistant') {
      for (const block of message.message.content) {
        if (block.type === 'text') console.log(block.text);
        if (block.type === 'tool_use') console.log(`[tool_use] ${block.name}`);
      }
    } else if (message.type === 'result') {
      console.log(`[result] ${message.subtype} · ${message.num_turns} turns`);
    }
  }
}
