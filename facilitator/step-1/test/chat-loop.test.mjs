import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { test } from 'node:test';
import { runChatLoop } from '../lib/chat-loop.mjs';

async function runPipedChat(text) {
  const calls = [];
  let outputText = '';
  const input = Readable.from([text]);
  const output = new Writable({
    write(chunk, encoding, callback) {
      outputText += chunk.toString();
      callback();
    },
  });

  await runChatLoop({
    input,
    output,
    options: { model: 'stub-model' },
    noMemory: false,
    backendArgument: 'sdk',
    runQuery: async (request) => {
      calls.push(request);
      return { sessionId: 'stub-session' };
    },
  });

  return { calls, outputText };
}

test('chat loop handles piped prompts and exit without a model call', async () => {
  const { calls, outputText } = await runPipedChat('first question\nsecond question\nexit\n');

  assert.deepEqual(calls.map(({ prompt }) => prompt), ['first question', 'second question']);
  assert.equal(calls[1].options.resume, 'stub-session');
  assert.match(outputText, /you> /);
});

test('chat loop ends cleanly when piped input reaches EOF', async () => {
  const { calls } = await runPipedChat('first question\nsecond question\n');

  assert.deepEqual(calls.map(({ prompt }) => prompt), ['first question', 'second question']);
});
