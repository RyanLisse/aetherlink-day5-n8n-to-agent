const usage = 'Usage: npm run chat -- [--lesson 1|2|3] [--backend claude-code|sdk|sdk-login] [--no-memory] [--structured] [--dry-run]';

export function parseArgs(args) {
  let lesson = '1';
  let noMemory = false;
  let dryRun = false;
  let structured = false;
  let backendArgument;

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--lesson') {
      lesson = args[index + 1];
      index += 1;
    } else if (args[index] === '--no-memory') {
      noMemory = true;
    } else if (args[index] === '--structured') {
      structured = true;
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

  return { lesson, noMemory, dryRun, structured, backendArgument };
}

export function selectChatOptions(options, { lesson, structured }) {
  const chatOptions = { ...options };
  if (structured && !chatOptions.outputFormat) {
    throw new Error(`Lesson ${lesson} has no structured output format; --structured requires outputFormat.`);
  }
  if (!structured) {
    delete chatOptions.outputFormat;
  }
  return chatOptions;
}
