import { createInterface } from 'node:readline';

export async function runChatLoop({ input, output, options, noMemory, backendArgument, runQuery }) {
  const readline = createInterface({ input, output });
  let sessionId;

  try {
    output.write('you> ');
    for await (const line of readline) {
      const prompt = line.trim();

      if (!prompt || prompt.toLowerCase() === 'exit') {
        break;
      }

      const turnOptions = {
        ...options,
        ...(!noMemory && sessionId ? { resume: sessionId } : {}),
      };
      const turn = await runQuery({ prompt, options: turnOptions, dryRun: false, backendArgument });

      if (!noMemory) {
        sessionId = turn.sessionId;
      }

      if (!input.readableEnded) {
        output.write('you> ');
      }
    }
  } finally {
    readline.close();
  }
}
