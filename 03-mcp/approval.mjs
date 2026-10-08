import { createInterface } from 'node:readline/promises';

export const WRITE_TOOLS = [
  'mcp__transactions__add_transaction',
  'mcp__transactions__update_transaction',
  'mcp__transactions__delete_transaction',
];

export const APPROVAL_NOTE = 'canUseTool asks a person before add_transaction, update_transaction and delete_transaction run.';

export function approvalDecision(toolName, input, answer) {
  if (!WRITE_TOOLS.includes(toolName)) {
    return { behavior: 'deny', message: `${toolName} is not available in this lesson.` };
  }

  if (['y', 'yes'].includes(answer.trim().toLowerCase())) {
    return { behavior: 'allow', updatedInput: input };
  }

  return { behavior: 'deny', message: 'A person declined this change; nothing was written.' };
}

export async function askPerson(toolName, input, { signal }) {
  if (!WRITE_TOOLS.includes(toolName)) {
    return approvalDecision(toolName, input, '');
  }

  if (!process.stdin.isTTY) {
    return { behavior: 'deny', message: 'No person is available to approve this change; nothing was written.' };
  }

  console.log(`\nApproval needed: ${toolName}`);
  console.log(JSON.stringify(input, null, 2));
  const readline = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return approvalDecision(toolName, input, await readline.question('Allow this change? [y/N] ', { signal }));
  } finally {
    readline.close();
  }
}
