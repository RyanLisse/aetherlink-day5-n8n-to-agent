import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { defaultDraftsDirectory } from './paths.mjs';

const draftsDirectory = path.resolve(process.env.DRAFTS_DIR ?? defaultDraftsDirectory);
const server = new McpServer({ name: 'drafts', version: '1.0.0' });

server.registerTool('save_reply_draft', {
  description: 'Save a reply draft for a person to review.',
  inputSchema: {
    message_id: z.string().regex(/^MSG-\d{2}$/),
    subject: z.string(),
    body: z.string(),
  },
}, async ({ message_id, subject, body }) => {
  mkdirSync(draftsDirectory, { recursive: true });
  const draftPath = path.join(draftsDirectory, `${message_id}.md`);
  writeFileSync(draftPath, `DRAFT - a person reviews this before sending.\n\nSubject: ${subject}\n\n${body}\n`);
  return { content: [{ type: 'text', text: `Draft saved: ${draftPath}` }] };
});

await server.connect(new StdioServerTransport());
