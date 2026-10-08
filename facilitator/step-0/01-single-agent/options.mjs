import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lessonDirectory = path.dirname(fileURLToPath(import.meta.url));

// n8n: the settings panel of the AI Agent node. SDK: the options object passed to query().
export function buildOptions() {
  return {
    // STEP 1: cwd → path.join(lessonDirectory, 'claude-project') so the agent works inside its own project folder.
    // STEP 1: settingSources → ['project'] so query() loads claude-project/CLAUDE.md (the n8n "System Message").
    // STEP 1: systemPrompt → { type: 'preset', preset: 'claude_code' } (CLAUDE.md is added on top of the preset).
    // STEP 1: tools → [] and disallowedTools → ['WebSearch', 'WebFetch', 'Bash']: this agent only reads and answers.
    // STEP 1: maxTurns → 2 (n8n: "Max Iterations").
  };
}

// Keeps the import used until Step 1 fills in cwd.
export const projectDirectory = path.join(lessonDirectory, 'claude-project');
