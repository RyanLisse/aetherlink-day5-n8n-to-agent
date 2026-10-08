import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { agents } from './agents.mjs';

const lessonDirectory = path.dirname(fileURLToPath(import.meta.url));

export function buildOptions() {
  return {
    cwd: path.join(lessonDirectory, 'claude-project'),
    settingSources: ['project'],
    systemPrompt: { type: 'preset', preset: 'claude_code' },
    agents,
    tools: ['Agent', 'Write'],
    allowedTools: ['Agent', 'Write'],
    disallowedTools: ['WebSearch', 'WebFetch', 'Bash'],
    permissionMode: 'acceptEdits',
    maxTurns: 10,
  };
}
