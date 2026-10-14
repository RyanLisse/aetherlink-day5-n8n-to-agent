import { stdin, stdout } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { runQuery } from './run.mjs';
import { runChatLoop } from './chat-loop.mjs';
import { backendLabel, formatCommand, selectBackend, toClaudeArgs } from './backend.mjs';
import { parseArgs, selectChatOptions } from './chat-options.mjs';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function loadOptions(lesson) {
  const lessonDirectory = ['01-single-agent', '02-subagents', '03-mcp'][Number(lesson) - 1];
  const optionsPath = path.join(packageDirectory, lessonDirectory, 'options.mjs');

  if (!existsSync(optionsPath)) {
    throw new Error(`Lesson ${lesson} is not available on this branch.`);
  }

  const { buildOptions } = await import(pathToFileURL(optionsPath).href);
  return { ...buildOptions() };
}

const { lesson, noMemory, dryRun, backendArgument, structured } = parseArgs(process.argv.slice(2));
const options = selectChatOptions(await loadOptions(lesson), { lesson, structured });
const backend = selectBackend({ argument: backendArgument });

if (dryRun) {
  console.log(`backend: ${backendLabel(backend)}`);
  console.log(`Chat lesson ${lesson} options:`);
  console.log(JSON.stringify(options, null, 2));
  console.log(`Claude Code equivalent: ${formatCommand('claude', toClaudeArgs('<chat input>', options))}`);
  console.log('dry run — no model call, not model evidence');
} else {
  await runChatLoop({
    input: stdin,
    output: stdout,
    options,
    noMemory,
    backendArgument: backend,
    runQuery,
  });
}
