import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { runQuery } from './run.mjs';
import { backendLabel, formatCommand, selectBackend, toClaudeArgs } from './backend.mjs';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const usage = 'Usage: npm run chat -- [--lesson 1|2|3] [--backend claude-code|sdk|sdk-login] [--no-memory] [--dry-run]';

function parseArgs(args) {
  let lesson = '1';
  let noMemory = false;
  let dryRun = false;
  let backendArgument;

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--lesson') {
      lesson = args[index + 1];
      index += 1;
    } else if (args[index] === '--no-memory') {
      noMemory = true;
    } else if (args[index] === '--dry-run') {
      dryRun = true;
    } else if (args[index] === '--backend') {
      backendArgument = args[index + 1];
      index += 1;
    } else if (args[index].startsWith('--backend=')) {
      backendArgument = args[index].slice('--backend='.length);
    } else {
      throw new Error(usage);
    }
  }

  if (!['1', '2', '3'].includes(lesson)) {
    throw new Error(usage);
  }

  return { lesson, noMemory, dryRun, backendArgument };
}

async function loadOptions(lesson) {
  const lessonDirectory = ['01-single-agent', '02-subagents', '03-mcp'][Number(lesson) - 1];
  const optionsPath = path.join(packageDirectory, lessonDirectory, 'options.mjs');

  if (!existsSync(optionsPath)) {
    throw new Error(`Lesson ${lesson} is not available on this branch.`);
  }

  const { buildOptions } = await import(pathToFileURL(optionsPath).href);
  const options = { ...buildOptions() };
  delete options.outputFormat;
  return options;
}

const { lesson, noMemory, dryRun, backendArgument } = parseArgs(process.argv.slice(2));
const options = await loadOptions(lesson);
const backend = selectBackend({ argument: backendArgument });

if (dryRun) {
  console.log(`backend: ${backendLabel(backend)}`);
  console.log(`Chat lesson ${lesson} options:`);
  console.log(JSON.stringify(options, null, 2));
  console.log(`Claude Code equivalent: ${formatCommand('claude', toClaudeArgs('<chat input>', options))}`);
  console.log('dry run — no model call, not model evidence');
} else {
  const readline = createInterface({ input: stdin, output: stdout });
  let sessionId;

  try {
    while (true) {
      const input = await readline.question('you> ');
      const prompt = input.trim();

      if (!prompt || prompt.toLowerCase() === 'exit') {
        break;
      }

      const turnOptions = {
        ...options,
        ...(!noMemory && sessionId ? { resume: sessionId } : {}),
      };
      const turn = await runQuery({ prompt, options: turnOptions, dryRun: false, backendArgument: backend });

      if (!noMemory) {
        sessionId = turn.sessionId;
      }
    }
  } finally {
    readline.close();
  }
}
