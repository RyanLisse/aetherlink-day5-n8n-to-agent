import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const directory = mkdtempSync(path.join(os.tmpdir(), 'drafts-smoke-'));
const draftsDirectory = path.join(directory, 'not-created-yet');
const draftPath = path.join(draftsDirectory, 'MSG-03.md');
const client = new Client({ name: 'drafts-smoke', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(serverDirectory, 'drafts-server.js')],
  env: { ...process.env, DRAFTS_DIR: draftsDirectory },
});
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  expect(tools.length === 1 && tools[0].name === 'save_reply_draft', 'The server must expose only save_reply_draft.');
  const result = await client.callTool({
    name: 'save_reply_draft',
    arguments: { message_id: 'MSG-03', subject: 'Payment update', body: 'We checked the payment.' },
  });
  expect(!result.isError, result.content?.[0]?.text ?? 'The draft tool failed.');
  expect(result.content[0].text === `Draft saved: ${draftPath}`, 'The tool must return the draft path.');
  expect(existsSync(draftPath), 'The server must create the draft directory.');
  expect(readFileSync(draftPath, 'utf8').startsWith('DRAFT - a person reviews this before sending.\n'), 'The draft must start with the review header.');

  await client.callTool({
    name: 'save_reply_draft',
    arguments: { message_id: 'MSG-03', subject: 'Revised update', body: 'We checked the payment again.' },
  });
  expect(readFileSync(draftPath, 'utf8').includes('Revised update'), 'A new draft must replace the earlier draft.');
  console.log('Draft smoke passed. The server saved and replaced a draft.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
  rmSync(directory, { recursive: true, force: true });
}
