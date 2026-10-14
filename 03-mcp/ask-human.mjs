import { createInterface } from 'node:readline';

export const NO_ANSWER_REASON = 'No person can answer. Report ESCALATE and stop.';

export function createAskHumanHandler({
  inputStream = process.stdin,
  outputStream = process.stdout,
} = {}) {
  return async (toolName, input) => {
    if (toolName !== 'AskUserQuestion') {
      return { behavior: 'deny', message: NO_ANSWER_REASON };
    }

    const questions = input?.questions;
    if (!inputStream.isTTY || !outputStream.isTTY || questions?.length !== 1) {
      return { behavior: 'deny', message: NO_ANSWER_REASON };
    }

    const [question] = questions;
    if (!question.question || !Array.isArray(question.options) || question.options.length < 2) {
      return { behavior: 'deny', message: NO_ANSWER_REASON };
    }

    outputStream.write(`${question.question}\n`);
    question.options.forEach((option, index) => {
      outputStream.write(`${index + 1}. ${option.label}: ${option.description}\n`);
    });

    const readline = createInterface({ input: inputStream, output: outputStream, terminal: false });
    try {
      const answer = await new Promise((resolve) => readline.question('Choose an option number: ', resolve));
      const selectedOption = question.options[Number(answer) - 1];
      if (!selectedOption) return { behavior: 'deny', message: NO_ANSWER_REASON };
      return {
        behavior: 'allow',
        updatedInput: {
          ...input,
          answers: { [question.question]: selectedOption.label },
        },
      };
    } finally {
      readline.close();
    }
  };
}
