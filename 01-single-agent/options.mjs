import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prioritySchema } from './priority-schema.mjs';

const lessonDirectory = path.dirname(fileURLToPath(import.meta.url));

export function buildOptions() {
  return {
    cwd: path.join(lessonDirectory, 'claude-project'),
    settingSources: ['project'],
    systemPrompt: { type: 'preset', preset: 'claude_code' },
    tools: [],
    disallowedTools: ['WebSearch', 'WebFetch', 'Bash'],
    maxTurns: 3,
    outputFormat: { type: 'json_schema', schema: prioritySchema },
  };
}
