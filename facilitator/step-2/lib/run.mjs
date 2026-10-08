import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMessages } from './messages.mjs';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const messagesPath = path.join(packageDirectory, 'docs', 'customer-messages.md');

export async function runLesson({ buildOptions, dryRunNote }) {
  const [id, ...args] = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const unexpectedArgs = args.filter((arg) => arg !== '--dry-run');

  if (!id || unexpectedArgs.length > 0) {
    throw new Error('Usage: node <lesson>/agent.mjs MSG-0N [--dry-run]');
  }

  const markdown = await readFile(messagesPath, 'utf8');
  const message = parseMessages(markdown).find((item) => item.id === id);

  if (!message) {
    throw new Error(`No customer message found for ${id}`);
  }

  const prompt = `Customer message ${message.id}\nSubject: ${message.subject}\n\n${message.message}`;
  await runQuery({ prompt, options: buildOptions(), dryRun, dryRunNote });
}

export async function runQuery({ prompt, options, dryRun, dryRunNote }) {
  if (dryRun) {
    console.log(prompt);
    console.log(JSON.stringify(options, null, 2));
    if (dryRunNote) {
      console.log(dryRunNote);
    }
    console.log('dry run — no model call, not model evidence');
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Set ANTHROPIC_API_KEY in this shell before running a lesson.');
  }

  const { query } = await import('@anthropic-ai/claude-agent-sdk');

  for await (const event of query({ prompt, options })) {
    if (event.type === 'assistant') {
      for (const block of event.message.content) {
        if (block.type !== 'tool_use') {
          continue;
        }

        if (block.name === 'Agent') {
          console.log(`Agent → ${block.input.subagent_type ?? 'subagent'}`);
        } else if (block.name.startsWith('mcp__')) {
          console.log(`mcp → ${block.name}`);
        }
      }
    }

    if (event.type === 'result') {
      console.log(event.result);
    }
  }
}
