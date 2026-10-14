import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { createAskHumanHandler, NO_ANSWER_REASON } from '../03-mcp/ask-human.mjs';

const questionInput = {
  questions: [{
    question: 'Continue with the update?',
    header: 'Update',
    options: [
      { label: 'Continue', description: 'Allow the proposed update.' },
      { label: 'Escalate', description: 'Stop and ask for review.' },
    ],
    multiSelect: false,
  }],
};

test('AskUserQuestion returns the selected answer through updatedInput', async () => {
  const inputStream = new PassThrough();
  const outputStream = new PassThrough();
  inputStream.isTTY = true;
  outputStream.isTTY = true;
  const handler = createAskHumanHandler({ inputStream, outputStream });
  const pending = handler('AskUserQuestion', questionInput);
  inputStream.end('1\n');
  const result = await pending;
  assert.equal(result.behavior, 'allow');
  assert.deepEqual(result.updatedInput, {
    ...questionInput,
    answers: { 'Continue with the update?': 'Continue' },
  });
});

test('AskUserQuestion denies when no TTY can answer', async () => {
  const handler = createAskHumanHandler({
    inputStream: { isTTY: false },
    outputStream: { isTTY: false },
  });
  assert.deepEqual(await handler('AskUserQuestion', questionInput), {
    behavior: 'deny',
    message: NO_ANSWER_REASON,
  });
});
