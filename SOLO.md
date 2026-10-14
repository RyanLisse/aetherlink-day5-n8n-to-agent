# Workshop 4 · Step by step

You build a support agent with Claude Code and the Claude Agent SDK in six steps. Each step:
**Goal → Build → Run → Check**. Every prompt the agent uses is printed in full at the
step where it appears.

You start on `main` (Step 0). Each step has a branch with the finished result:
`step-1`, `step-2`, `step-3`, `step-4` (= `solution`). In a fresh clone, fetch
the remote branches before copying files or comparing steps:

```sh
git fetch origin
git checkout origin/step-1 -- path/to/file
git diff origin/main origin/step-1
git diff origin/step-1 origin/step-2
```

If you fall behind with local or untracked work, save it and switch to the target
branch. `git switch step-N` creates a tracking branch from `origin/step-N` when
needed:

```sh
git stash -u
git fetch origin
git switch step-N
npm ci
npm run verify
```

Use `--` between `npm run lessonN` and its arguments. Message IDs have two
digits: `MSG-01`. Claude Code is the default backend when no API key is set.
Every `--dry-run` works offline and shows the Claude Code equivalent.

| Step | You build | Catch-up branch |
| --- | --- | --- |
| 0 | Setup, customer context, offline chat and Switch routing | `main` |
| 1 | One agent + system prompt + structured priority output | `step-1` |
| 2 | Orchestrator + `risk-agent` + `customer-reply-agent` | `step-2` |
| 3 | Read-only transaction/customer MCP tools + human review of reply drafts | `step-3` |
| 4 | Acceptance table and `npm run check` | `step-4` |
| 5 | Build your own agent | `step-4` |

---

## Step 0 · Setup, dry run, smoke test

**Goal:** the project installs and a dry run shows what would be sent to the model.

### How the loop works here

An agent run starts with a prompt and options. Claude Code or the SDK sends them to the model,
which can answer or request tools. Tool results return to the model for another turn, until it
finishes or reaches `maxTurns`. The runner prints initialization, assistant, tool-use, tool-result
and result events. A chat session resumes its `sessionId` on the next turn; a lesson run starts a
fresh session for one ticket. Read the [illustrative sample trace](docs/sample-trace.md); it is
hand-written and is not model evidence.

### Demo (facilitator) → Your turn

**Goal:** see the offline route before changing code.

**Facilitator demo:**

```sh
npm run doctor
npm run lesson1 -- MSG-01 --dry-run
```

Point out the prompt, options, Claude Code equivalent, and the dry-run disclaimer.

**Your turn:** install the dependencies and run the same dry run below.

```sh
node --version          # v22 or newer
git clone https://github.com/RyanLisse/aetherlink-day5-n8n-to-agent.git
cd aetherlink-day5-n8n-to-agent
npm ci
npm run doctor
npm run verify
npm run lesson1 -- MSG-01 --dry-run
npm run chat -- --dry-run
```

**Check:** `npm run verify` reports `# fail 0`. The dry run prints the customer ID and message,
the options (still `{}`), a Claude Code equivalent, and `dry run — no model call, not model evidence`.
`npm run chat -- --dry-run` prints the options and exits without authentication.

**Look around:** `docs/customer-messages.md` (MSG-01 to MSG-10), `docs/transactions.xlsx`,
`docs/customer_context.csv` (the file Maarten's Data Table was imported from),
`docs/n8n-flow-diagram.html` (open it in your browser, next to your own n8n flow from
yesterday), `lib/run.mjs` (the `query()` loop), and `01-single-agent/options.mjs` with its
`// STEP 1` TODOs.

n8n then: Execute workflow or the Chat Message trigger started one run. SDK now:
`npm run lessonN -- MSG-0N` starts one run; `npm run chat` accepts free text and resumes
the prior session, like Simple Memory.

Claude Code is the default for real runs. See [Set up Workshop 4](docs/SETUP.md) for platform
instructions and optional API-key use with the `sdk` backend.

---

## Step 1 · One agent + system prompt + Priority Parser

**Goal:** one agent classifies a customer message as LOW, MEDIUM or HIGH, guided by project
instructions. n8n then: the AI Agent node with a System Message, before any sub agent (Maarten's
slide 4). SDK now: `query()` with options, and the system message lives in `CLAUDE.md`.

### How the loop works here

`buildOptions()` loads the project instructions, tools and JSON schema; the result event prints
the parsed priority and the Switch route.

### Demo (facilitator) → Your turn

**Goal:** compare the offline command with the completed structured result.

**Facilitator demo:** run `npm run lesson1 -- MSG-01 --dry-run`, then show a completed run or the
illustrative trace in `docs/sample-trace.md`. Point out `Structured output:` and `Switch → low`.

**Your turn:** build the options, prompt and schema below; then use the dry-run and chat commands.

**Build 1 — the options.** Replace the entire `01-single-agent/options.mjs` file:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lessonDirectory = path.dirname(fileURLToPath(import.meta.url));

export function buildOptions() {
  return {
    cwd: path.join(lessonDirectory, 'claude-project'),
    settingSources: ['project'],
    systemPrompt: { type: 'preset', preset: 'claude_code' },
    tools: [],
    disallowedTools: ['WebSearch', 'WebFetch', 'Bash'],
    maxTurns: 3,
  };
}
```

The system prompt is the built-in `claude_code` preset; `settingSources: ['project']` adds
`claude-project/CLAUDE.md` on top of it. `maxTurns` is n8n's "Max Iterations".

**Build 2 — the prompt.** Replace `01-single-agent/claude-project/CLAUDE.md` with:

```markdown
# Customer Support Triage

## Purpose
You are a customer-support assistant for a payment company. Read each incoming customer message and assign a priority.

## Rules
- Use only information supplied by the user or available inside this project.
- Do not search the web for customer or transaction information.
- Do not invent facts.
- If important information is missing, say what is missing.
- Keep your explanation concise.

## Priority definitions
- **LOW** — General questions, requests for information, cosmetic issues, or situations with little/no immediate customer or financial impact.
- **MEDIUM** — A real service or payment problem affecting one customer, but with no clear sign of fraud, security risk, major financial exposure, or widespread impact.
- **HIGH** — Suspected fraud or security risk, unknown/unauthorised transactions, multiple affected transactions, substantial or time-critical financial impact, or evidence that many customers may be affected.
- Judge impact and risk, not tone: angry wording alone never raises the priority, and calm wording never lowers it.

## Required output
Return the priority (`low`, `medium` or `high`) and a reason of one or two sentences.
The SDK turns this into JSON (the Priority Parser).
```

**Build 3 — the Priority Parser.** Create `01-single-agent/priority-schema.mjs`:

```js
export const prioritySchema = {
  type: 'object',
  properties: {
    priority: { type: 'string', enum: ['low', 'medium', 'high'] },
    reason: { type: 'string' },
  },
  required: ['priority', 'reason'],
  additionalProperties: false,
};
```

Import it from `./priority-schema.mjs` and add this property to `buildOptions()`:

```js
outputFormat: { type: 'json_schema', schema: prioritySchema },
```

The structured output parser needs an extra turn, so leave `maxTurns: 3`. A live result trace prints
the parsed JSON and a `Switch → low → AUTO_REPLY (Self-service support)` route.
After building Step 1, offline inspect `01-single-agent/priority-schema.mjs`, the dry-run
`outputFormat`, and `lib/switch.mjs`. The JSON result and `Switch →` line require a logged-in Claude
Code run or `docs/sample-trace.md` labelled as a sample.
Copy the matching test from the finished branch so the hand-built verify covers this step:

```sh
git checkout origin/step-1 -- test/step1.test.mjs
```

**Build 4 — memory.** Yesterday Simple Memory remembered your favourite colour inside one chat.
Here the session is the memory: inside one `query()` the agent remembers every turn. Try:

```sh
npm run chat
you> My favorite color is red
you> What is my favorite color?
you> exit
npm run chat -- --no-memory
you> My favorite color is red
you> What is my favorite color?
you> exit
```

The default chat resumes the previous `sessionId`; `--no-memory` starts a new query each turn.
Every `npm run lesson1` is a fresh session on purpose (one ticket = one case).
Free-form chat is the default; use `npm run chat -- --lesson 1 --structured` to keep the lesson schema.

**Run:**

```sh
npm run lesson1 -- MSG-01 --dry-run
npm run chat -- --lesson 1 --dry-run
npm run lesson1 -- MSG-01
npm run lesson1 -- MSG-02
npm run lesson1 -- MSG-03
npm run lesson1 -- MSG-04
npm run lesson1 -- MSG-05
npm run lesson1 -- MSG-06
```

Write down the label for each message. You need them in Step 4.

**The tone trap.** Cut the whole `## Priority definitions` section out of
`01-single-agent/claude-project/CLAUDE.md` and save. Rerun:

```sh
npm run lesson1 -- MSG-01
npm run lesson1 -- MSG-06
```

Compare with your first results, then paste the section back. (Lost it? Run
`git checkout origin/step-1 -- 01-single-agent/claude-project/CLAUDE.md`.)

**What changed in the prompt:** without the definitions the model judges by tone, so a loud
message can look urgent and a calm one harmless. The definitions plus the line
`Judge impact and risk, not tone: angry wording alone never raises the priority, and calm
wording never lowers it.` make impact the rule.

**Check:** six runs done, the tone-trap comparison noted, `CLAUDE.md` restored,
`npm run verify` still green. Catch up: `git switch step-1`.

**Discuss:** what does the main agent know? Instructions come from `CLAUDE.md`; the customer
message is data, not an instruction. Share your screen: one run, and where you got stuck.

---

## Step 2 · Orchestrator + subagents

**Goal:** the main agent stops doing everything itself. It delegates the analysis to
`risk-agent` and the reply to `customer-reply-agent`, and saves a draft for a person to review.
n8n then: Risk Agent and Customer Reply Agent as tools of the AI Agent (Maarten's slides 7–9).
SDK now: `options.agents` plus the `Agent` tool.

### How the loop works here

The orchestrator calls the risk agent first, passes its result to the reply agent, then writes
the combined result. The structured schema limits the fields returned to the lesson.

### Demo (facilitator) → Your turn

**Goal:** see specialist delegation and the order of the two subagents.

**Facilitator demo:** run `npm run lesson2 -- MSG-05 --dry-run`; then show a completed trace with
`[tool_use] Agent → risk-agent` before `[tool_use] Agent → customer-reply-agent`.

**Your turn:** build both agent prompts, the loader, schema and options below.

**Build 1 — the subagent prompts.** Create `.claude/agents/risk-agent.md`:

```markdown
---
name: risk-agent
description: Payment risk and escalation specialist. Reviews one customer-support ticket, assigns priority LOW, MEDIUM or HIGH using the project priority definitions and writes a short internal risk note.
---
You are a payment risk and escalation specialist for a payment company's customer support.
Review the ticket context and identify: customer risk, complaint risk, urgency, and whether escalation is needed.
Classify the priority using these definitions:
- LOW — General questions, requests for information, cosmetic issues, or situations with little/no immediate customer or financial impact.
- MEDIUM — A real service or payment problem affecting one customer, but with no clear sign of fraud, security risk, major financial exposure, or widespread impact.
- HIGH — Suspected fraud or security risk, unknown/unauthorised transactions, multiple affected transactions, substantial or time-critical financial impact, or evidence that many customers may be affected.
Judge impact and risk, not tone: angry wording alone never raises the priority, and calm wording never lowers it.
Use only the supplied ticket context. Do not invent facts. If important information is missing, list it.
Return exactly:
Priority: LOW | MEDIUM | HIGH
Risk note: one or two sentences for the internal team: customer risk, complaint risk, urgency, escalate yes/no.
Missing information: none, or a short list.
```

Create `.claude/agents/customer-reply-agent.md`:

```markdown
---
name: customer-reply-agent
description: Customer support communication specialist. Writes a short, friendly and professional reply draft to the customer, using the ticket context and the risk-agent result from the main agent.
---
You are a customer support communication specialist.
You write the reply email to the customer of a payment company.
You receive the original message and the risk-agent result. Do not change or re-decide the priority.
Write a short, polite reply in plain English: acknowledge the issue, say what happens next, and ask for any missing information the risk-agent listed.
Do not promise refunds, reversals, compensation or timelines. Do not invent facts.
Start with `Subject:` and end with `Draft — needs human approval before sending.`
Do not mention the internal risk note or the priority.
```

This is the Claude Code subagent format, and it is exactly the split from yesterday's Risk Agent
settings: the frontmatter `description` is n8n's **Description** (it tells the orchestrator when
to delegate), the body is n8n's **System Message** (the subagent's own prompt).

**Build 2 — load them.** Create `lib/agents.mjs`:

```js
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const agentsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.claude', 'agents');

// Reads a subagent from .claude/agents/<name>.md (the same file format Claude Code uses):
// the frontmatter `description` tells the orchestrator when to delegate, the body is the subagent's prompt.
// The tools are set in code, per lesson, so each subagent gets only what it needs.
export function loadAgent(name, tools = []) {
  const text = readFileSync(path.join(agentsDirectory, `${name}.md`), 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (!match) {
    throw new Error(`.claude/agents/${name}.md needs a --- frontmatter block with a description.`);
  }

  const description = /^description:\s*(.+)$/m.exec(match[1])?.[1]?.trim();

  if (!description) {
    throw new Error(`.claude/agents/${name}.md has no description in its frontmatter.`);
  }

  return { description, prompt: match[2].trim(), tools };
}
```

Create `02-subagents/agents.mjs`:

```js
import { loadAgent } from '../lib/agents.mjs';

// n8n: the Risk Agent and Customer Reply Agent tool nodes. SDK: options.agents.
// The prompts live in .claude/agents/risk-agent.md and .claude/agents/customer-reply-agent.md.
export const agents = {
  'risk-agent': loadAgent('risk-agent'),
  'customer-reply-agent': loadAgent('customer-reply-agent'),
};
```

**Build 3 — structured output and the orchestrator.** Create `02-subagents/ticket-schema.mjs`:

```js
export const ticketSchema = {
  type: 'object',
  properties: {
    priority: { type: 'string', enum: ['low', 'medium', 'high'] },
    sentiment: { type: 'string', enum: ['neutral', 'frustrated', 'angry'] },
    recommended_action: { type: 'string', enum: ['auto_reply', 'investigate', 'escalate'] },
    summary: { type: 'string' },
    risk_note: { type: 'string' },
    customer_reply: { type: 'string' },
  },
  required: ['priority', 'sentiment', 'recommended_action', 'summary', 'risk_note', 'customer_reply'],
  additionalProperties: false,
};
```

Create `02-subagents/options.mjs`:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { agents } from './agents.mjs';
import { ticketSchema } from './ticket-schema.mjs';

const lessonDirectory = path.dirname(fileURLToPath(import.meta.url));

export function buildOptions() {
  return {
    cwd: path.join(lessonDirectory, 'claude-project'),
    settingSources: ['project'],
    systemPrompt: { type: 'preset', preset: 'claude_code' },
    agents,
    tools: ['Agent', 'Write'],
    allowedTools: ['Agent', 'Write'],
    disallowedTools: ['WebSearch', 'WebFetch', 'Bash'],
    permissionMode: 'acceptEdits',
    maxTurns: 10,
    outputFormat: { type: 'json_schema', schema: ticketSchema },
  };
}
```

Create `02-subagents/agent.mjs`:

```js
import { runLesson } from '../lib/run.mjs';
import { buildOptions } from './options.mjs';

await runLesson({ buildOptions });
```

Create `02-subagents/claude-project/CLAUDE.md` (the orchestrator's prompt):

```markdown
# Customer Support Orchestrator

## Purpose
Coordinate specialised agents that process incoming customer-support messages.

## Workflow
1. Delegate analysis and priority classification to the `risk-agent`.
2. Wait for the analyst result.
3. Delegate the customer reply to the `customer-reply-agent`, including the original message and risk-agent result.
4. Create a Markdown file in `output/` with the final result.

## Required output
Fill the structured fields from the specialist agents' results: `priority`, `sentiment`,
`recommended_action`, `summary`, `risk_note` and `customer_reply`.

## Rules
- Do not perform specialist analysis yourself when `risk-agent` is available.
- Do not write the customer email yourself when `customer-reply-agent` is available.
- Use only supplied/project information.
- Do not search the web for customer or transaction information.
- Do not invent facts.
```

Create the empty folder `02-subagents/claude-project/output/` and add
`"lesson2": "node 02-subagents/agent.mjs"` after `"lesson1"` in `package.json`. Add the folder's
`output/.gitkeep` so Git tracks it. Update `verify` to run `npm run lesson2 -- MSG-05 --dry-run`
after the lesson 1 dry run and before the chat dry run, and copy the Step 2 test:

```sh
git checkout origin/step-2 -- test/step2.test.mjs
```

Shortcut: `git checkout origin/step-2 -- .claude lib/agents.mjs 02-subagents package.json test/step2.test.mjs`
copies all Step 2 files.

**Run:**

```sh
npm run lesson2 -- MSG-05 --dry-run
npm run lesson2 -- MSG-05
npm run lesson2 -- MSG-10
```

**Offline check:** `--dry-run` shows setup only; it does not call agents, create a draft, or produce
the MSG-10 missing-information result. Use a logged-in Claude Code run or `docs/sample-trace.md`
(clearly labelled sample) for those results.

**Check:** in a live run, the trace shows `Agent → risk-agent` before `Agent → customer-reply-agent`.
Open `02-subagents/claude-project/output/MSG-05.md` only after a live run. For `MSG-10`, the live
run or labelled sample shows the analyst listing the missing information. No `Agent →` lines? The
orchestrator did the work itself: run again and discuss why.

**The description test.** Replace the `description:` of `.claude/agents/risk-agent.md` with
something vague (`Helps with things.`) and rerun `MSG-05`. Does the orchestrator still delegate?
Restore it with `git checkout origin/step-2 -- .claude/agents/risk-agent.md`. Yesterday the same
thing happened in n8n when the Risk Agent's Description was empty. Catch up: `git switch step-2`.

---

## Step 3 · Read-only customer and transaction MCP tools

**Goal:** `risk-agent` looks up transaction facts and `customer-context-agent` looks up customer
facts through read-only tools. Neither agent reads a data file itself. n8n then: the Customer
Context Agent with `Get row(s) in Data table` over the Data Table imported from
`customer_context.csv` (Maarten's slides 10–11). SDK now: two stdio MCP servers in
`options.mcpServers`.

Data paths: `docs/transactions.xlsx → get_transaction → risk-agent`; and
`docs/customer_context.csv → get_customer → customer-context-agent`.

### How the loop works here

Two stdio MCP servers expose narrow read-only lookups: `get_transaction` and `list_transactions`
for transactions, and `get_customer` for customer context. A person reviews each reply draft before
it is sent; the MCP servers do not change records.

### Demo (facilitator) → Your turn

**Goal:** verify each MCP server without making a model call, then follow the data path.

**Facilitator demo:** run `npm run smoke:mcp`. Point out
`MCP servers OK — read-only lookups; no model was called.`
and show the dry-run command's MCP configuration. A real trace labels calls `[tool_use]`.

**Your turn:** check out the Step 3 starter files, install both dependency sets, and run the smoke test.

**Get the server:**

```sh
git checkout origin/step-3 -- 03-mcp .mcp.json .claude lib package.json test/step3.test.mjs
npm ci
(cd 03-mcp/transaction-mcp && npm ci)
npm run smoke:mcp
```

The nested install is for the server's own dependencies. It does not start the servers: the SDK
starts each on demand over stdio. Do not start them yourself. The smoke test calls the tools on
their own (no model) and ends with
`MCP servers OK — read-only lookups; no model was called.`

**Read the read-only tools in `03-mcp/transaction-mcp/server.js`:**

```js
const server = new McpServer({ name: 'transactions', version: '1.1.0' });

server.registerTool('get_transaction', {
  description: 'Look up one transaction by its transaction ID.',
  inputSchema: { transaction_id: z.string().regex(/^TX-\d{4}$/) },
  annotations: { title: 'Get transaction', readOnlyHint: true, openWorldHint: false },
}, async ({ transaction_id }) => {
  const transaction = findTransaction(await readWorkbook(), transaction_id);
  return transaction ? ok(transaction) : notFound(transaction_id);
});

server.registerTool('list_transactions', {
  description: 'List transactions with optional status, customer, or fraud filters.',
  inputSchema: {
    status: z.enum(['COMPLETED', 'DECLINED', 'PENDING', 'REFUNDED', 'FAILED', 'DUPLICATE']).optional(),
    customer: z.string().min(1).optional(),
    fraud_flag: z.enum(['Yes', 'No']).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { title: 'List transactions', readOnlyHint: true, openWorldHint: false },
}, async ({ status: wanted, customer, fraud_flag, limit }) => (
  ok(listTransactions(await readWorkbook(), { status: wanted, customer, fraudFlag: fraud_flag, limit }))
));

await server.connect(new StdioServerTransport());
```

**The wiring in `03-mcp/options.mjs`:**

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { agents } from './agents.mjs';
import { defaultWorkbookPath } from './transaction-mcp/paths.mjs';

const lessonDirectory = path.dirname(fileURLToPath(import.meta.url));
const transactionServer = path.join(lessonDirectory, 'transaction-mcp', 'server.js');
const customerServer = path.join(lessonDirectory, 'transaction-mcp', 'customers.js');
const workbook = defaultWorkbookPath;
const customerContext = path.join(path.dirname(lessonDirectory), 'docs', 'customer_context.csv');

export function buildOptions() {
  return {
    cwd: path.join(lessonDirectory, 'claude-project'),
    settingSources: ['project'],
    systemPrompt: { type: 'preset', preset: 'claude_code' },
    agents,
    tools: ['Agent', 'Write'],
    allowedTools: [
      'Agent', 'Write',
      'mcp__transactions__get_transaction', 'mcp__transactions__list_transactions',
      'mcp__customers__get_customer',
    ],
    disallowedTools: ['WebSearch', 'WebFetch', 'Bash'],
    permissionMode: 'acceptEdits',
    maxTurns: 10,
    mcpServers: {
      transactions: {
        type: 'stdio',
        command: 'node',
        args: [transactionServer],
        env: { TRANSACTIONS_XLSX: workbook },
      },
      customers: {
        type: 'stdio',
        command: 'node',
        args: [customerServer],
        env: { CUSTOMER_CONTEXT_CSV: customerContext },
      },
    },
  };
}
```

`.mcp.json` registers the same server for Claude Code:

```json
{
  "mcpServers": {
    "transactions": {
      "type": "stdio",
      "command": "node",
      "args": ["03-mcp/transaction-mcp/server.js"]
    },
    "customers": {
      "type": "stdio",
      "command": "node",
      "args": ["03-mcp/transaction-mcp/customers.js"]
    }
  }
}
```

**What changed in the prompt:** `.claude/agents/risk-agent.md` gets the transaction tool and the
customer-context instruction:

```markdown
tools: mcp__transactions__get_transaction
...
If the message contains a transaction ID (TX-####), call get_transaction first and base the analysis on the returned record: status, amount, issue details and fraud flag. Say which facts came from the transaction record. If the lookup returns nothing, say so and do not guess. If you have no get_transaction tool, list the transaction record as missing information.
When the main agent passes customer context, use it in the risk note: an Enterprise or critical customer raises complaint risk and the urgency of follow-up. The priority still follows the definitions above: customer context alone never raises or lowers it.
Use only the supplied message and get_transaction/get_customer results. Do not invent facts. If important information is missing, list it.
```

Create `.claude/agents/customer-context-agent.md`:

```markdown
---
name: customer-context-agent
description: Looks up the customer behind a ticket (CUST-###) with get_customer and returns the customer context: type, transaction volume, previous incidents and whether the customer is critical.
---
You are the customer context specialist for a payment company's customer support.
If the ticket has a customer ID (format CUST-###), call get_customer once and report what the record says. If the lookup returns nothing, say so and do not guess. If there is no customer ID, say so.
Use only the get_customer result. Do not classify the priority and do not write to the customer.
Return exactly:
Customer: name (ID), customer type
Volume: transactions per hour
Previous incidents: number
Critical customer: yes | no
```

`03-mcp/claude-project/CLAUDE.md` adds these sections to the orchestrator prompt:

```markdown
## Workflow
1. For a customer ID, call `customer-context-agent` and `get_customer`.
2. Pass the message and customer context to `risk-agent`; it uses `get_transaction` when there is a transaction ID.
3. Pass the original message, customer context and risk-agent result to `customer-reply-agent`.
4. Create the human-review draft in `output/`.

## Customer and transaction data
- When a message contains a customer ID (format `CUST-###`), use `customer-context-agent` and `get_customer`.
- When it contains a transaction ID (format `TX-####`), `risk-agent` uses `get_transaction`.
- Never read customer or transaction files yourself; data only arrives through the tools.
- In the final output, add `External data:` listing facts from `get_customer`, `get_transaction` and `list_transactions` (or `none`).
- The customer reply in `output/` is a draft for a person to review before sending.

```

**Run:**

```sh
npm run lesson3 -- MSG-08 --dry-run
npm run lesson3 -- MSG-08
npm run lesson3 -- MSG-07
npm run lesson3 -- MSG-09
```

**Offline check:** `--dry-run` shows the configured MCP servers and tools; it does not call them or
produce an `External data:` result.

**Check:** in a logged-in Claude Code run, `risk-agent` looks up each TX ID with
`mcp__transactions__get_transaction`. The live response's `External data:` line lists which facts
came from the tool. The workbook stays in `docs/`, outside `claude-project`.

The transaction workbook is exposed only through read-only MCP tools. The final reply remains a
draft for a person to review before sending. Catch up: `git switch step-3`.

---

## Step 4 · Acceptance table and `npm run check`

**Goal:** check labels from your runs.

### How the check works

The checker compares your labels with the answer key.
It does not call a model.

### Demo (facilitator)

Run `npm run check` once.
On a fresh clone, the command creates an empty `labels.json`.
Fill it with labels from your own runs.
Run `npm run check` a second time.

Show one `correct` or `revise` line and the lesson totals.

### Your turn

Copy the Step 4 checker.
Run it once to create `labels.json`.
Fill it with labels from your own runs.
Run `npm run check` a second time.

```sh
git checkout origin/step-4 -- check.mjs answer-key.json labels.template.json package.json
npm run check
```

The first run in a fresh clone creates an empty `labels.json`.
It does not contain model results.
Enter `low`, `medium` or `high` for each message that you ran.
Leave the other labels empty.
Run `npm run check` a second time:

```text
MSG-01 correct
MSG-02 revise
Lesson 1 (MSG-01 to MSG-06): 5/6 REVISE
Lesson 3 (MSG-01 to MSG-09): 5/9 REVISE
```

(Example output only.) The check passes when Lesson 1 is 6/6 and no filled-in label is wrong;
Lesson 3 passes at 9/9. `MSG-10` is not graded. `revise` means: reread the priority definitions and
the trace. Do not change a label just to pass.

**Acceptance table** — copy and fill in:

| Message | Agent label | Customer context (`get_customer`) | Transaction facts (`get_transaction`) | Draft reviewed by a person? |
| --- | --- | --- | --- | --- |
| MSG-01 | | | none | |
| MSG-05 | | | none | |
| MSG-07 | | | | |
| MSG-08 | | | | |
| MSG-09 | | | | |

Save the completed acceptance table in `participant-output/` or your squad's `intent.md`.
Catch up: `git switch step-4` (or `solution`).

---

## Step 5 · Build your own agent

**Goal:** build a small code-fixing agent and identify where its prompt, tools and result handling live.

**n8n then / SDK now:** yesterday you connected nodes; here you compose a prompt, allowed tools and a query loop.

**How the loop works here:** the SDK yields assistant messages, tool uses and a final result. The allowed-tools list limits what the model can do; the permission mode controls edits.

**Demo (facilitator, ~5 min):** show the starter's offline command, then run the Claude Code equivalent:

```sh
cd 05-build-your-own
node agent.mjs --dry-run
claude -p "Find and fix the bug in utils.js. Explain the change." --allowedTools Read,Edit,Glob --permission-mode acceptEdits
```

**Your turn (~15–20 min):** use `05-build-your-own/README.md` to initialize the folder and install the SDK. With an API key, run `node agent.mjs`; without one, run `node agent.mjs --dry-run` or use your Claude Code login with the command above.

**Check:** explain which message is a tool use and which is the final result.

**Catch up:** `git switch step-4`.

**Discuss:** what prompt or tool would make this agent useful for your own work?

---

## Stretch · Assignment: chat in, chat out

Yesterday's assignment: the ticket goes in via the Chat Input, through the whole flow, and a chat
message comes back. Same assignment, in code:

```sh
cd aetherlink-day5-n8n-to-agent
npm run chat -- --lesson 3
```

Or use Claude Code:

```sh
cd aetherlink-day5-n8n-to-agent
claude
```

Claude Code reads `.mcp.json` (the transaction and customer servers) and `.claude/agents/`
(`risk-agent`, `customer-reply-agent`, `customer-context-agent`), so the whole Step 3 flow is
available from a chat.

1. Paste one customer message with a `TX-####` ID from `docs/customer-messages.md` and ask for the
   priority, the analysis and a reply draft.
2. Watch the trace: which subagent ran, which MCP tool was called?
3. Ask a follow-up in the same chat. Now the session is the memory, like Simple Memory yesterday.
4. Explore, like "look at other nodes" yesterday: add a `SKILL.md` or a `PreToolUse` hook. What
   would you change in `CLAUDE.md`?

More stretch:

- Run `MSG-07` to `MSG-09` with `lesson2` (no tool) and compare with `lesson3`.
- Compare the customer and transaction facts returned by the read-only MCP tools.

## Assignment · Extend the MCP: CRUD tools, hooks and a workflow

Do the core first: Part 1 and Part 2 (about 35 minutes). Part 3 and Part 4 are stretch.

Build this assignment after Step 4. Keep the Step 3 lesson read-only.
Write only to `participant-output/transactions.working.json`.
Never write to `docs/transactions.xlsx`.

### Part 1 · Add CRUD tools and a transaction agent (core)

**How it works.** The MCP server reads the workbook as its seed. It saves changes to a JSON copy.
Set `TRANSACTIONS_STORE` to use another copy. Give `transaction-agent` only the tools it needs.
Keep `risk-agent` and `customer-context-agent` read-only.
Give `customer-reply-agent` only the draft tool.
Give no agent `delete_transaction`.

**Demo (facilitator).** Show the three Zod input schemas in `03-mcp/transaction-mcp/server.js`.
Run one update. Show the JSON copy. Then run `npm run reset:mcp`.

**Your turn:**

1. Add `add_transaction`, `update_transaction` and `delete_transaction` to
   `03-mcp/transaction-mcp/server.js`. Use Zod input schemas.
2. Use the starter `03-mcp/transaction-mcp/store.mjs` to load and save the JSON copy.
   Add it to `server.js` when you add write tools.
   Use the starter `03-mcp/transaction-mcp/reset.mjs`; `npm run reset:mcp` removes the copy and drafts.
3. Create `03-mcp/claude-project/.claude/agents/transaction-agent.md` with `name: transaction-agent`.
   Give it exactly these tools: `get_transaction`, `update_transaction` and `add_transaction`.
4. Add `transaction-agent` to the SDK `agents` option and the Claude Code agent files.
   Keep write tools out of the orchestrator's `allowedTools`.
5. Keep existing `issue_details` and append ` | MSG-0N (customer report): <one short sentence of what the customer says>`.
6. Treat the added sentence as the only customer claim, not a confirmed fact.
7. Copy each status and existing detail exactly.
8. Change status only when the ticket and tool results support a new status.
   Otherwise, keep the current status exactly.

**Done when:** a smoke test adds, updates and deletes records in a new temporary store.
Check that the workbook hash stays the same.
Make `transaction-agent` look up a record before it writes.
Check that it keeps existing `issue_details` and appends one claim with the label `MSG-0N (customer report):`.
Change status only when the ticket and tool results support a new status.
Otherwise, check that it keeps the current status exactly.

### Part 2 · Add conditional approval hooks (core)

**How it works.** Use four permission layers.
Check each agent's tool list first.
Then check the orchestrator's `allowedTools` and `permissionMode`.
Next, run the `PreToolUse` hook.
Ask a person last. Reads pass without a prompt.
Allow updates below €100 without a prompt.
Ask a person before larger updates, adds and deletes.
Keep the €100 threshold in one constant.
Use the starter `03-mcp/hook-demo.mjs` with `npm run hook:demo -- small`; it sends fixture JSON to the real hook.

| Situation | Result |
| --- | --- |
| `risk-agent` tries a write | The agent has no write tool. The call fails. |
| `transaction-agent` updates a record below €100 | Allow the update. Write one audit line. |
| `transaction-agent` updates a record at or above €100 | Ask in an SDK TTY or interactive Claude Code. Deny under `claude -p`. |
| An agent calls `delete_transaction` | No agent has this tool. Ask a person if a caller reaches it. |
| A reviewer denies a write | Stop. Do not retry or delegate the write. |

**Demo (facilitator).** Run a small update. Show its audit line.
Run a large update. Deny it. Show that the agent stops.

**Your turn:**

1. Add `03-mcp/hooks/transaction-guard.mjs`.
   Register it for write tools in both backends.
2. Allow reads without a prompt.
   Check transaction IDs and statuses before writes.
3. Allow updates below €100 without a prompt.
   Ask a person before larger updates, adds and deletes.
4. Add one JSON line to `participant-output/audit.jsonl` after each write.
5. Tell the orchestrator and `transaction-agent` to stop after a denial.

**Done when:** the offline hook check covers all five table rows.
Use this exact reason when a person denies a write:
`Denied by a human reviewer. Do not retry this write or delegate it; report it and stop.`

### Part 3 · Add drafts and a fraud-check agent (stretch)

**How it works.** `save_reply_draft` saves a Markdown draft.
The file starts with `DRAFT - a person reviews this before sending.`
The tool overwrites a draft with the same message ID.
`customer-reply-agent` gets this tool and no transaction tools.
`fraud-check-agent` gets only customer and transaction read tools.
It returns `fraud_risk`, `signals` and `hold`.
Stop before a write when `hold` is true or risk is high.

**Demo (facilitator).** Save a draft for `MSG-07`.
Show the header and the saved path.
Ask `fraud-check-agent` to check a transaction.
Show its JSON result.

**Your turn:**

1. Add `03-mcp/transaction-mcp/drafts-server.js` with the `save_reply_draft` tool.
2. Validate `message_id` with `^MSG-\d{2}$`.
3. Use `DRAFTS_DIR` to choose the draft folder.
4. Create the folder before you save a draft.
5. Add `drafts` to `.mcp.json` and assignment options in `options.mjs`.
6. Keep `drafts` out of Step 3 options.
7. Create `.claude/agents/customer-reply-agent.md` with `name: customer-reply-agent`.
8. Give it only `mcp__drafts__save_reply_draft`.
9. Create `.claude/agents/fraud-check-agent.md` with `name: fraud-check-agent`.
10. Give it only `get_transaction`, `list_transactions` and `get_customer`.
11. Make it return the required JSON fields.
12. Wire both agents in `03-mcp/agents.mjs`.
13. Let the hook allow draft saves without a prompt.
14. Audit each draft save in `PostToolUse`.

**Where and why.** Add `drafts-server.js` to save reply files.
Edit `paths.mjs` to set the default draft folder.
Edit `customer-reply-agent.md` to limit draft access.
Edit `fraud-check-agent.md` to define its read-only check.
Edit `agents.mjs` to set SDK tools.
Edit `transaction-guard.mjs` to allow and audit drafts.
Edit `.mcp.json` to load the server in Claude Code.

**Done when:** the test saves a draft to a temporary folder.
Check the required header and overwrite behavior.
Check that the fraud agent has only read tools.

### Part 4 · Ask a person and resolve a ticket (stretch)

**How it works.** Use the built-in `AskUserQuestion` tool.
Do not build a custom MCP tool for questions.
Ask one question when risk is medium or a fact is missing.
Use transaction IDs from `list_transactions` for choices.
In an SDK TTY, show the question and its options.
Without a TTY, report `ESCALATE` and stop.
Use interactive `claude --allowedTools AskUserQuestion` for the Claude Code prompt.
The `claude -p` workflow excludes this tool and reports `ESCALATE`.
Keep `AskUserQuestion` in SDK `tools`, but not in SDK `allowedTools`.

**Demo (facilitator).** Run `npm run resolve -- MSG-07 --backend sdk` in a TTY.
MSG-07 links CUST-007 to TX-1007, Vertex Commerce.
The amount is €899. The status is FAILED.
The note says "amount appears reserved."
Approve one run with `y`. Deny another run with `N`.
After approval, check the labelled customer report in `issue_details`.
Check that the status stays `FAILED`.
Check that a denial stops without a retry, another agent, or a draft.
Run MSG-08. TX-1014 has `Fraud Flag Yes`.
Check that the workflow reports `ESCALATE` and makes no write.
Run MSG-09. CUST-004 does not match TX-1018, which belongs to Juniper Hotels.
Choose Escalate in the question. Check that the workflow makes no write.
Run MSG-09 without a TTY. Check that the workflow reports `ESCALATE`.
Run `npm run hook:demo -- small`.
Use `large`, `add`, `delete`, or `read` for another case.
The small fixture uses TX-1002 (€49.99). The large fixture uses TX-1007 (€899).
No ticket fits a small update. Do not invent one.

**Your turn:**

1. Add `03-mcp/ask-human.mjs` for the SDK `canUseTool` callback.
2. Return the person's answer through `updatedInput`.
3. Deny the question when no TTY can answer.
4. Give `AskUserQuestion` to the orchestrator only.
5. Keep it in SDK `tools`, but not in SDK `allowedTools`.
6. Add the fraud check and question rules to `CLAUDE.md`.
7. Add `npm run resolve -- MSG-0N [--backend sdk|claude-code] [--dry-run]`.
8. Add `.claude/commands/resolve-ticket.md` with the same workflow.
9. Call `fraud-check-agent` before a write.
10. Stop with `ESCALATE` when `hold` is true or risk is high.
11. Save the reply draft with `customer-reply-agent`.
12. Add tests for the question handler and the resolve dry run.
13. Extend `scripts/check-assignment.mjs` and its tests.

**Where and why.** Edit `ask-human.mjs` to handle SDK questions.
Edit `options.mjs` to give the tool to the orchestrator.
Edit `resolve.mjs` to run the fixed workflow.
Edit `resolve-ticket.md` to run it in interactive Claude Code.
Edit `CLAUDE.md` to state the agent rules.
Edit `check-assignment.mjs` to check the rules without a model.
Edit `hook-demo.mjs` to send fixtures to the real hook with Node.

**Done when:** the resolve dry run lists every step and branch.
The SDK test checks a TTY answer and a no-TTY denial.
`npm run check:assignment` passes on the solution branch.
Run `npm run check:assignment` on Step 4 to see missing tasks.

### Check your work

Run `npm run check:assignment` after Part 2 and again after Part 4.

- If core items remain, the check exits 1. Fix them first.
- If core passes with open stretch items, the check exits 0. Stretch is optional.
- If both parts pass, the check reports success and exits 0.
- Run `npm run check:assignment -- --strict` to require stretch. Open stretch items then exit 1.

## Wrap-up · recap round, bridge to Workshop 5

Recap round: everyone shows one result in one minute (a trace, a draft, the check output, or the
chat). One agent, two subagents, one MCP tool, and a person who reviews every draft. Which part was
easier in n8n, and which in code? Where must a person still decide?
