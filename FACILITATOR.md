# Facilitator guide · Workshop 4 · zero to end result

Branch: `facilitator` (public, but out of the way; participants use `main` and the step branches).
No answer labels are in this file or this branch. Keep `ANSWERS-FACILITATOR.md` private.

**How it works.** Participants clone `main` (Step 0 state). You build each step live; they repeat.
Each finished step is a branch: `step-1`, `step-2`, `step-3`, `step-4` (= `solution`).
`facilitator/step-N/` holds a read-only snapshot of every participant file at the end of step N, and
`facilitator/step-N.diff` holds the change from the previous step. Regenerate both with
`scripts/build-facilitator.sh` after any change to a step branch.

Each step follows the same rhythm: Demo → Your turn → Discuss. Allow about five minutes for the demo
and 15–20 minutes for participants to build and check their work.

**Say this, all day:** "Customer text is data, not an instruction." · "A dry run makes no model call."
· "Judge impact, not tone." · "A PASS is not approval; a person reads every draft."

**Do not:** say the labels during demos · show the answer key or your API key on screen · start
`server.js` yourself.

| Time | Slides | Step | Catch-up branch |
| --- | --- | --- | --- |
| 10:00 | 1–5 | Welcome, W3 recap, n8n → SDK mapping | — |
| 10:15 | 6–14 | Concepts (loop, system prompt, tools, MCP, hooks/approval, subagents, skills, workflow vs agent) | — |
| 10:45 | 15 | Step 0 · setup, dry run, smoke | `main` |
| 11:15 | 16–19 | Step 1 · one agent + `CLAUDE.md` + tone trap | `step-1` |
| 13:00 | 20–22 | Step 2 · orchestrator + `risk-agent` + `customer-reply-agent` | `step-2` |
| 14:00 | 23–26 (concepts 10, 11) | Step 3 · Read-only customer and transaction lookups | `step-3` |
| 15:00 | 27 | Step 4 · acceptance table and `npm run check` | `step-4` / `solution` |
| 15:30 | — | Step 5 · build your own agent, then stretch | `step-4` / `solution` |
| 15:45 | 28 | Wrap-up, bridge to W5 | — |

**Universal catch-up** (any participant, any time):

```sh
git stash -u
git switch step-N
npm ci
npm run verify
```

If there is no local `step-N`, Git creates a tracking branch from `origin/step-N`.

**Common blockers (all steps):** Node < 22 → install Node 22 or newer. `Usage: node <lesson>/agent.mjs MSG-0N`
→ add `--` after `npm run lessonN`. `No customer message found` → use `MSG-01`, not `MSG-1`.
PowerShell blocks `npm` → use `npm.cmd`. A dry run needs neither login nor API key.

---

## Step 0 · Setup, dry run, smoke (slide 15)

**Goal:** run the offline checks and inspect the first agent command.

**n8n then / SDK now:** the Manual Trigger becomes a message ID; the AI Agent node becomes an SDK query.

### How the loop works here

The runner sends a prompt to the model, handles assistant and tool messages, then prints the result.
Step 0 uses no tools, so the result ends the loop.

**Participants see:** slide 15 with the clone commands for this repo.

### Demo (facilitator, ~5 min)

Run the doctor and offline commands:

```sh
npm run doctor
npm run lesson1 -- MSG-01 --dry-run
npm run chat -- --dry-run
```

**Say:** Claude Code is the default backend. An API key is optional.

**Expected trace:** `backend: claude-code`, `Claude Code equivalent: claude -p ...`, and
`dry run — no model call, not model evidence`. Use `docs/sample-trace.md` to explain the event labels.

**Common failure and fix:** if `npm run doctor` cannot find `claude`, install Claude Code by following
`docs/SETUP.md`. Dry runs still work without it.

### Your turn (~15–20 min)

```sh
node --version
git clone https://github.com/RyanLisse/aetherlink-day5-n8n-to-agent.git
cd aetherlink-day5-n8n-to-agent
npm ci
npm run verify
npm run lesson1 -- MSG-01 --dry-run
npm run chat -- --dry-run
```

**Check:** `npm run verify` reports 10 passing tests. The dry run prints the message, options, and the
Claude Code equivalent command without calling a model.

**Show:** `docs/customer-messages.md`, `docs/transactions.xlsx`, `docs/n8n-flow-diagram.html` (browser),
`lib/run.mjs` (the event loop and dry run), and `docs/SETUP.md`.

The runner they already have (`lib/run.mjs`):

```js
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMessages } from './messages.mjs';
import { route } from './switch.mjs';
import {
  backendLabel,
  findClaudeBinary,
  formatCommand,
  runClaudeCode,
  selectBackend,
  toClaudeArgs,
} from './backend.mjs';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const messagesPath = path.join(packageDirectory, 'docs', 'customer-messages.md');

export async function runLesson({ buildOptions, dryRunNote }) {
  let backendArgument;
  const args = [];
  const inputArgs = process.argv.slice(2);
  for (let index = 0; index < inputArgs.length; index += 1) {
    const arg = inputArgs[index];
    if (arg === '--backend') {
      backendArgument = inputArgs[index + 1];
      if (!backendArgument) {
        throw new Error('--backend needs claude-code, sdk, or sdk-login.');
      }
      index += 1;
    } else if (arg.startsWith('--backend=')) {
      backendArgument = arg.slice('--backend='.length);
      if (!backendArgument) {
        throw new Error('--backend needs claude-code, sdk, or sdk-login.');
      }
    } else {
      args.push(arg);
    }
  }
  const [id, ...lessonArgs] = args;
  const dryRun = lessonArgs.includes('--dry-run');
  const unexpectedArgs = lessonArgs.filter((arg) => arg !== '--dry-run');

  if (!id || unexpectedArgs.length > 0) {
    throw new Error('Usage: node <lesson>/agent.mjs MSG-0N [--dry-run]');
  }

  const markdown = await readFile(messagesPath, 'utf8');
  const message = parseMessages(markdown).find((item) => item.id === id);

  if (!message) {
    throw new Error(`No customer message found for ${id}`);
  }

  const prompt = `Customer message ${message.id}\nCustomer: ${message.customer}\nSubject: ${message.subject}\n\n${message.message}`;
  await runQuery({ prompt, options: buildOptions(), dryRun, dryRunNote, backendArgument });
}

export function assertBackendAccess(backend) {
  if (backend === 'sdk' && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('The sdk backend needs ANTHROPIC_API_KEY. Use the default claude-code backend or set a key for this shell.');
  }
  if (backend === 'claude-code') {
    const binary = findClaudeBinary();
    if (!binary) {
      throw new Error('Claude Code is not on PATH. Install it from https://code.claude.com/docs/en/setup.');
    }
    if (!binary.native) {
      throw new Error('The claude.cmd shim cannot run without a shell. Install the native Claude Code CLI from https://code.claude.com/docs/en/setup.');
    }
    return binary.command;
  }
  return null;
}

export function printEvent(event) {
  if (event.type === 'system' && event.subtype === 'init') {
    const tools = event.tools?.join(', ') ?? 'none';
    const servers = event.mcp_servers?.map((server) => server.name ?? server).join(', ') ?? 'none';
    console.log(`[system:init] model ${event.model ?? 'unknown'} · tools ${tools} · MCP ${servers}`);
  }

  if (event.type === 'assistant') {
    for (const block of event.message.content) {
      if (block.type === 'text') {
        console.log(`[assistant] ${block.text}`);
      } else if (block.type === 'tool_use') {
        if (block.name === 'Agent') {
          console.log(`[tool_use] Agent → ${block.input.subagent_type ?? 'subagent'}`);
        } else if (block.name.startsWith('mcp__')) {
          console.log(`[tool_use] ${block.name}`);
        } else {
          console.log(`[tool_use] ${block.name}`);
        }
      }
    }
  }

  if (event.type === 'user') {
    const results = event.message?.content?.filter((block) => block.type === 'tool_result') ?? [];
    for (const block of results) {
      const text = typeof block.content === 'string' ? block.content : JSON.stringify(block.content ?? '');
      console.log(`[tool_result] ${text.replace(/\s+/g, ' ').slice(0, 160)}`);
    }
  }

  if (event.type === 'result' && event.subtype === 'error_max_structured_output_retries') {
    console.error('Structured output failed: the model could not satisfy the schema after maximum retries (error_max_structured_output_retries).');
  }

  if (event.type === 'result') {
    const duration = event.duration_ms === undefined ? '' : ` · ${event.duration_ms} ms`;
    const cost = event.total_cost_usd === undefined ? '' : ` · $${event.total_cost_usd}`;
    console.log(`[result] ${event.subtype ?? 'completed'} · ${event.num_turns ?? 0} turns${duration}${cost}`);
  }

  if (event.type === 'result' && event.structured_output !== undefined) {
    console.log('Structured output:');
    console.log(JSON.stringify(event.structured_output, null, 2));

    const priority = event.structured_output?.priority;
    const selectedRoute = route(priority);

    if (selectedRoute) {
      console.log(`Switch → ${priority} → ${selectedRoute.action} (${selectedRoute.team})`);
    }
  }
}

export async function runQuery({ prompt, options, dryRun, dryRunNote, backendArgument }) {
  return runWithBackend({ prompt, options, dryRun, dryRunNote, backendArgument });
}

export async function runWithBackend({ prompt, options, dryRun, dryRunNote, backendArgument }) {
  const backend = selectBackend({ argument: backendArgument });
  const claudeArgs = toClaudeArgs(prompt, options);

  console.log(`backend: ${backendLabel(backend)}`);
  if (dryRun) {
    console.log(prompt);
    console.log(JSON.stringify(options, null, 2));
    console.log(`Claude Code equivalent: ${formatCommand('claude', claudeArgs)}`);
    if (dryRunNote) {
      console.log(dryRunNote);
    }
    console.log('dry run — no model call, not model evidence');
    return { sessionId: null, result: null };
  }

  const command = assertBackendAccess(backend);

  if (backend === 'claude-code') {
    return runClaudeCode({ command, prompt, options, onEvent: printEvent });
  }

  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  let sessionId = null;
  let result = null;

  const savedApiKey = process.env.ANTHROPIC_API_KEY;
  if (backend === 'sdk-login') {
    delete process.env.ANTHROPIC_API_KEY;
  }
  try {
    for await (const event of query({ prompt, options })) {
      sessionId = event.session_id ?? sessionId;
      printEvent(event);

      if (event.type === 'result') {
        result = event.structured_output ?? event.result;
      }
    }
  } catch (error) {
    if (backend === 'sdk-login' && /not logged in|login|authentication/i.test(error.message)) {
      throw new Error('Not logged in. Run `claude` once and log in.');
    }
    throw error;
  } finally {
    if (backend === 'sdk-login' && savedApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = savedApiKey;
    }
  }

  return { sessionId, result };
}
```

**Say:** n8n's Manual Trigger is now `npm run lesson1 -- MSG-01`. The default backend uses your Claude Code
login; use `sdk` only when you want to provide an API key.

**Discuss:** which parts of the trace represent a model turn, a tool call, and a result?

**Timer:** 5 min demo, 15–20 min build and check.

---

## Step 1 · One agent + system prompt + `CLAUDE.md` (slides 16–19; concepts 7, 8, 9)

**Goal:** add a system prompt and a validated priority result.

**n8n then / SDK now:** the AI Agent System Message becomes `CLAUDE.md`; the Structured Output Parser
becomes `outputFormat`.

### How the loop works here

The system prompt guides the model. The JSON schema validates the final result, and the Switch routes
the parsed priority.

**Participants see:** slide 16 (explain), 17 (demo: MSG-01 loud vs MSG-02 calm), 18 (their turn: MSG-01..06
+ tone trap), 19 (discuss).

### Demo (facilitator, ~5 min)

```sh
npm run lesson1 -- MSG-01 --dry-run
npm run lesson1 -- MSG-01
```

**Say:** point out the loaded project prompt, structured output, and route in the live result.

**Expected live trace:** `[assistant]`, `Structured output:`, and `Switch → low`.

**Common failure and fix:** if the options omit the schema, inspect `01-single-agent/options.mjs` and
confirm that it imports `prioritySchema`.

### Your turn (~15–20 min)

**Structured output schema — `01-single-agent/priority-schema.mjs`:**

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

**Build 1 — `01-single-agent/options.mjs`.** Type it in this order, explaining each line:

1. `cwd` → the agent works in `claude-project/`.
2. `settingSources: ['project']` → loads `claude-project/CLAUDE.md`.
3. `systemPrompt` preset → Claude Code's built-in system prompt; `CLAUDE.md` is added on top.
4. `tools: []`, `disallowedTools` → this agent only reads and answers.
5. `maxTurns: 3` and `outputFormat` → bounded turns and a validated priority result.

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prioritySchema } from './priority-schema.mjs';

const lessonDirectory = path.dirname(fileURLToPath(import.meta.url));

export function buildOptions() {
  return {
    cwd: path.join(lessonDirectory, 'claude-project'),
    settingSources: ['project'],
    systemPrompt: { type: 'preset', preset: 'claude_code' },
    tools: [],
    disallowedTools: ['WebSearch', 'WebFetch', 'Bash'],
    maxTurns: 3,
    outputFormat: { type: 'json_schema', schema: prioritySchema },
  };
}
```

**Build 2 — the prompt, `01-single-agent/claude-project/CLAUDE.md`** (replace the TODO file). The system
prompt is the `claude_code` preset plus this file:

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

**Check:**

```sh
npm run lesson1 -- MSG-01 --dry-run
npm run chat -- --lesson 1 --dry-run
```

**Expected:** the dry run prints the Claude Code equivalent. For a live run, compare the priority and
reason for MSG-01 and MSG-02. Do not say whether either label is right.
Participants then run `MSG-01` to `MSG-06` and write down the labels (they fill them in during Step 4).

**Memory exercise:** run `npm run chat -- --lesson 1`, ask a follow-up, then repeat with
`npm run chat -- --lesson 1 --no-memory` and compare. The chat session is memory; `--no-memory` starts
each turn independently.

Chat stays free-form by default; use `npm run chat -- --lesson 1 --structured` to keep the schema and show `Structured output:` plus `Switch →`.

**Tone trap (slide 18):** cut the `## Priority definitions` section, save, rerun `MSG-01` and `MSG-06`,
compare, paste it back. Restore if lost: `git checkout origin/step-1 -- 01-single-agent/claude-project/CLAUDE.md`.
(Don't tell people building on `main` to `git restore` — that brings back the TODO skeleton.)

**What changed in the prompt:** without definitions the model follows tone. The fix is the definitions plus
`- Judge impact and risk, not tone: angry wording alone never raises the priority, and calm wording never lowers it.`

**Say:** n8n's System Message box is now a file under version control (`CLAUDE.md`), loaded by
`settingSources`. Max Iterations is `maxTurns`. The Switch did the routing in n8n; here the label is in the
model's text and gets checked deterministically in Step 4.

**Discuss (slide 19):** what does the main agent know? Instructions (`CLAUDE.md`) vs data (the message).

**Common failure and fix:** if the prompt does not load, check `cwd` and `settingSources`. If verification
finds a TODO, replace the remaining placeholder in `CLAUDE.md`.

**Catch-up:** `git switch step-1` · see the change:
`git diff main origin/step-1` (or `facilitator/step-1.diff`).

**Verify:** `npm run verify` reports 13 passing tests.

**Timer:** 5 min demo, 15–20 min build and check.

---

## Step 2 · Orchestrator + `risk-agent` + `customer-reply-agent` (slides 20–22; concept 12)

**Goal:** delegate ticket analysis and reply drafting to two specialist agents.

**n8n then / SDK now:** Risk Agent and Customer Reply Agent nodes become SDK subagents.

### How the loop works here

The orchestrator calls the risk agent, then passes its result to the reply agent. Each subagent runs
inside the orchestrator's loop.

**Participants see:** slide 20 (explain), 21 (demo: trace + `output/MSG-05.md`), 22 (their turn: MSG-05, MSG-10).

### Demo (facilitator, ~5 min)

```sh
npm run lesson2 -- MSG-05 --dry-run
npm run lesson2 -- MSG-05
```

**Say:** point out the two Agent tool calls and the draft written for human review.

**Expected live trace:** `Agent → risk-agent`, then `Agent → customer-reply-agent`, then the result.

**Common failure and fix:** if the reply agent runs first, inspect the workflow order in the Step 2 prompt.

### Your turn (~15–20 min)

**Build 1 — the subagent prompts.** `.claude/agents/risk-agent.md`:

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

`.claude/agents/customer-reply-agent.md`:

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

**Build 2 — load them into `options.agents`.** `lib/agents.mjs`:

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

`02-subagents/agents.mjs`:

```js
import { loadAgent } from '../lib/agents.mjs';

// n8n: the Risk Agent and Customer Reply Agent tool nodes. SDK: options.agents.
// The prompts live in .claude/agents/risk-agent.md and .claude/agents/customer-reply-agent.md.
export const agents = {
  'risk-agent': loadAgent('risk-agent'),
  'customer-reply-agent': loadAgent('customer-reply-agent'),
};
```

**Build 3 — the orchestrator.** `02-subagents/options.mjs` (new lines vs Step 1: `agents`, `tools: ['Agent', 'Write']`,
`allowedTools`, `permissionMode: 'acceptEdits'`, `maxTurns: 10`):

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

`02-subagents/agent.mjs`:

```js
import { runLesson } from '../lib/run.mjs';
import { buildOptions } from './options.mjs';

await runLesson({ buildOptions });
```

The orchestrator prompt, `02-subagents/claude-project/CLAUDE.md`:

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

`02-subagents/ticket-schema.mjs` defines the structured ticket output. The branch also adds the
`lesson2` dry run to `verify` and the Step 2 tests; keep `02-subagents/claude-project/output/.gitkeep`.

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

**Check:**

```sh
npm run lesson2 -- MSG-05 --dry-run
npm run chat -- --lesson 2 --dry-run
```

**Offline:** the dry run prints setup only; it does not call agents, write a draft, or produce the
MSG-10 missing-information result. Use a logged-in Claude Code run or the clearly labelled sample in
`docs/sample-trace.md` for those results.

**Expected:** the dry run prints the Claude Code equivalent. A live run writes a Markdown draft to
`02-subagents/claude-project/output/`. For MSG-10, the live run or labelled sample shows the risk
agent listing missing information and the reply asking for it.

**Say:** n8n's Risk Agent and Customer Reply Agent were tool nodes hanging off the AI Agent. Now they
are `options.agents` entries; the `Agent` tool is the wire. The risk agent has transaction MCP tools
only in Step 3; both Step 2 subagents have no tools (least privilege). The human gate is the draft in
`output/` that a person reviews.

**Common failure and fix:** if a draft is missing, check that `Write` is in `tools` and that the
orchestrator uses `permissionMode: 'acceptEdits'`.

**Verify:** `npm run verify` reports 16 passing tests.

**Catch-up:** `git switch step-2` · `git diff origin/step-1 origin/step-2`
(or `facilitator/step-2.diff`).

**Discuss:** what information should stay with the risk agent, and what belongs in the customer reply?

**Timer:** 5 min demo, 15–20 min build and check.

---

## Step 3 · Customer and transaction MCP tools (slides 23–26; concepts 10, 11)

**Goal:** run read-only customer and transaction lookups. Have a person review each reply draft.

**n8n then / SDK now:** the workflow's data nodes become MCP tools started by the SDK.

### How the loop works here

The agents use read-only MCP tools to get customer and transaction facts.
A person reviews each reply draft.

**Participants see:** slide 23 (data path), 24 (demo: tool trace), 25 (their turn: MSG-08, MSG-07, MSG-09), 26 (discuss).

Data paths: `docs/customer_context.csv → customers.js → get_customer → customer-context-agent` and
`docs/transactions.xlsx → server.js → get_transaction → risk-agent`.

### Demo (facilitator, ~5 min)

```sh
npm run smoke:mcp
npm run lesson3 -- MSG-08 --dry-run
```

**Say:** the smoke test calls both servers without a model. The dry run shows configured MCP
servers/tools only; it does not call them or produce `External data:`.

**Smoke output:** `get_customer CUST-003`, `get_transaction TX-1014`, and
`MCP server OK — no model was called.`

**Common failure and fix:** if the smoke test cannot find a package, run `npm ci` from the repository root.

### Your turn (~15–20 min)

**Build 1 — the server package.** `03-mcp/transaction-mcp/package.json` (its own dependencies:
`@modelcontextprotocol/sdk`, `read-excel-file`, `zod`):

```json
{
  "name": "w4-transaction-mcp",
  "private": true,
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/sdk": "1.32.1",
    "read-excel-file": "9.3.10",
    "zod": "4.6.5"
  }
}
```

The root `package.json` installs it via `"postinstall": "node 03-mcp/transaction-mcp/install.mjs"`.
Where the data lives, `03-mcp/transaction-mcp/paths.mjs`:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// The workbook lives in docs/ (outside every claude-project). Only server.js reads it.
export const defaultWorkbookPath = path.join(repoRoot, 'docs', 'transactions.xlsx');
export const defaultCustomerContextPath = path.join(repoRoot, 'docs', 'customer_context.csv');
```

Rows to records, `03-mcp/transaction-mcp/transactions.mjs` (first part; the rest is the stretch write logic):

```js
const fields = new Map([
  ['Transaction ID', 'transactionId'],
  ['Customer', 'customer'],
  ['Amount', 'amount'],
  ['Status', 'status'],
  ['Date', 'date'],
  ['Currency', 'currency'],
  ['Issue Details', 'issueDetails'],
  ['Fraud Flag', 'fraudFlag'],
]);

export function rowsToTransactions(rows) {
  const headers = rows[0] ?? [];
  const columns = headers.map((header) => fields.get(header));

  return rows.slice(1).map((row) => Object.fromEntries(
    columns.flatMap((key, index) => (key ? [[key, row[index]]] : [])),
  ));
}

export function findTransaction(transactions, id) {
  return transactions.find((transaction) => transaction.transactionId === id) ?? null;
}
```

**Build 2 — the server, `03-mcp/transaction-mcp/server.js`, line by line.**

Imports and setup:

```js
import readXlsxFile from 'read-excel-file/node';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { defaultWorkbookPath } from './paths.mjs';
import { findTransaction, listTransactions, rowsToTransactions, STATUSES } from './transactions.mjs';

const workbookPath = process.env.TRANSACTIONS_XLSX ?? defaultWorkbookPath;
const server = new McpServer({ name: 'transactions', version: '1.1.0' });

const transactionId = z.string().regex(/^TX-\d{4}$/);
const status = z.enum(STATUSES);
const fraudFlag = z.enum(['Yes', 'No']);
const readOnly = { readOnlyHint: true, openWorldHint: false };

const readWorkbook = async () => {
  const sheets = await readXlsxFile(workbookPath);
  return rowsToTransactions(Array.isArray(sheets) && sheets[0]?.data ? sheets[0].data : sheets);
};
const ok = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
const fail = (text) => ({ isError: true, content: [{ type: 'text', text }] });
const notFound = (id) => fail(`No transaction ${id} in the data`);

server.registerTool('list_transactions', {
```

Read the workbook (only the server touches the xlsx) and the result helpers:

```js
  inputSchema: {
    status: status.optional(),
    customer: z.string().min(1).optional(),
    fraud_flag: fraudFlag.optional(),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { title: 'List transactions', ...readOnly },
}, async ({ status: wanted, customer, fraud_flag, limit }) => (
```

The tool: name, description, input schema (the contract), annotations, handler:

```js

```

`list_transactions` (cheap, read-only):

```js
));

server.registerTool('get_transaction', {
  description: 'Look up one transaction by its transaction ID.',
  inputSchema: { transaction_id: transactionId },
  annotations: { title: 'Get transaction', ...readOnly },
}, async ({ transaction_id }) => {
  const transaction = findTransaction(await readWorkbook(), transaction_id);
  return transaction ? ok(transaction) : notFound(transaction_id);
});

await server.connect(new StdioServerTransport());
```

Connect over stdio:

```js

```

Customer lookup, `03-mcp/transaction-mcp/customers.js`, reads the CSV (default
`docs/customer_context.csv`, override `CUSTOMER_CONTEXT_CSV`) and exposes only `get_customer`:

```js
import { readFile } from 'node:fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { defaultCustomerContextPath } from './paths.mjs';

const csvPath = process.env.CUSTOMER_CONTEXT_CSV ?? defaultCustomerContextPath;
const server = new McpServer({ name: 'customers', version: '1.0.0' });
const customerId = z.string().regex(/^CUST-\d{3}$/);
const readOnly = { readOnlyHint: true, openWorldHint: false };
const ok = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
const numberOrNull = (value) => value === '' ? null : Number(value);
const notFound = (id) => ({
  isError: true,
  content: [{ type: 'text', text: `No customer ${id} in the data` }],
});

async function findCustomer(id) {
  const [headerLine, ...rows] = (await readFile(csvPath, 'utf8')).trim().split(/\r?\n/);
  const headers = headerLine.split(',');

  for (const row of rows) {
    const values = row.split(',');
    const customer = Object.fromEntries(headers.map((header, index) => [header, values[index]]));

    if (customer.customer_id === id) {
      return {
        customer_id: customer.customer_id,
        customer_name: customer.customer_name,
        customer_type: customer.customer_type,
        transactions_per_hour: numberOrNull(customer.transactions_per_hour),
        previous_incidents: numberOrNull(customer.previous_incidents),
        critical: customer.critical === '' ? null : customer.critical.toLowerCase() === 'true',
      };
    }
  }

  return null;
}

server.registerTool('get_customer', {
  description: 'Look up the customer context for one customer ID.',
  inputSchema: { customer_id: customerId },
  annotations: { title: 'Get customer', ...readOnly },
}, async ({ customer_id }) => {
  const customer = await findCustomer(customer_id);
  return customer ? ok(customer) : notFound(customer_id);
});

await server.connect(new StdioServerTransport());
```

**Run it on its own (no model):**

```sh
npm ci
npm run smoke:mcp
```

**Expected:** the transaction and customer tool lists, the `TX-1014` record, `CUST-003` resolving to
GlobalPay Commerce, `CUST-999` reported not found, `transactions.xlsx unchanged`, and
`MCP server OK — no model was called.`

**Build 3 — wire it into the SDK.** `03-mcp/options.mjs` adds `mcpServers` over stdio and read tools to
`allowedTools`:

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
      'Agent',
      'Write',
      'mcp__transactions__get_transaction',
      'mcp__transactions__list_transactions',
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

`.mcp.json`, so Claude Code sees the same server:

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

**Build 5 — subagent tools, `03-mcp/agents.mjs`:**

```js
import { loadAgent } from '../lib/agents.mjs';

// Least privilege: each subagent gets only the tools it needs.
export const agents = {
  'risk-agent': loadAgent('risk-agent', ['mcp__transactions__get_transaction']),
  'customer-reply-agent': loadAgent('customer-reply-agent'),
  'customer-context-agent': loadAgent('customer-context-agent', ['mcp__customers__get_customer']),
};
```

**What changed in the prompts.** `.claude/agents/risk-agent.md` gets the `tools:` line, the transaction
lookup paragraph and the customer-context rule:

```markdown
---
name: risk-agent
description: Payment risk and escalation specialist. Reviews one customer-support ticket, assigns priority LOW, MEDIUM or HIGH using the project priority definitions and writes a short internal risk note.
tools: mcp__transactions__get_transaction
---
You are a payment risk and escalation specialist for a payment company's customer support.
Review the ticket context and identify: customer risk, complaint risk, urgency, and whether escalation is needed.
Classify the priority using these definitions:
- LOW — General questions, requests for information, cosmetic issues, or situations with little/no immediate customer or financial impact.
- MEDIUM — A real service or payment problem affecting one customer, but with no clear sign of fraud, security risk, major financial exposure, or widespread impact.
- HIGH — Suspected fraud or security risk, unknown/unauthorised transactions, multiple affected transactions, substantial or time-critical financial impact, or evidence that many customers may be affected.
Judge impact and risk, not tone: angry wording alone never raises the priority, and calm wording never lowers it.
If the message contains a transaction ID (TX-####), call get_transaction first and base the analysis on the returned record: status, amount, issue details and fraud flag. Say which facts came from the transaction record. If the lookup returns nothing, say so and do not guess. If you have no get_transaction tool, list the transaction record as missing information.
When the main agent passes customer context, use it in the risk note: an Enterprise or critical customer raises complaint risk and the urgency of follow-up. The priority still follows the definitions above: customer context alone never raises or lowers it.
Use only the supplied ticket context and get_transaction results. Do not invent facts. If important information is missing, list it.
Return exactly:
Priority: LOW | MEDIUM | HIGH
Risk note: one or two sentences for the internal team: customer risk, complaint risk, urgency, escalate yes/no.
Missing information: none, or a short list.
```

New: `.claude/agents/customer-context-agent.md`:

```markdown
---
name: customer-context-agent
description: Looks up the customer behind a ticket (CUST-###) with get_customer and returns the customer context: type, transaction volume, previous incidents and whether the customer is critical.
tools: mcp__customers__get_customer
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

`03-mcp/claude-project/CLAUDE.md` coordinates all three specialists and adds customer and transaction
data rules:

```markdown
# Customer Support Orchestrator

## Purpose
Coordinate specialised agents that process incoming customer-support messages.

## Workflow
1. When the ticket has a Customer ID, delegate lookup to `customer-context-agent`.
2. Delegate analysis to `risk-agent` with the message and customer context.
3. Delegate the customer reply to `customer-reply-agent` with the message, customer context and risk-agent result.
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

## Customer data
- Never read `docs/customer_context.csv` yourself; customer data only arrives through `get_customer`.

## Transaction data
- When it contains a transaction ID (format `TX-####`), `risk-agent` uses `get_transaction`.
- `risk-agent` may use `list_transactions` to find relevant transaction records.
- Never read transaction files yourself; transaction data only arrives through the tool.
- In the final output, add `External data:` listing facts from `get_transaction`, `list_transactions` and `get_customer` (or `none`).
- The customer reply in `output/` is a draft for a person to review before sending.
- Transaction records are read-only; never change them.
```

`03-mcp/agent.mjs`:

```js
import { runLesson } from '../lib/run.mjs';
import { buildOptions } from './options.mjs';

await runLesson({ buildOptions });
```

Scripts added to `package.json`: `postinstall`, `lesson3` and `smoke:mcp`.
The smoke test covers both read-only MCP servers.

**Run:**

```sh
npm run lesson3 -- MSG-08 --dry-run
npm run lesson3 -- MSG-08
npm run lesson3 -- MSG-07
npm run lesson3 -- MSG-09
```

**Offline:** the dry run only prints the Claude Code command and MCP config; it makes no tool calls
and produces no `External data:` result.

**Expected live result:** `customer-context-agent → get_customer` and `risk-agent → get_transaction`
when their IDs are present, followed by `customer-reply-agent`, with an `External data:` line.

**Talking point:** in n8n you'd use an HTTP Request or Google Sheets node: the workflow itself fetches the row.
Here a separate MCP server owns the data and exposes typed read tools. The agents can call the tools, but
they cannot read the xlsx. The input schema rejects a bad ID before the handler runs. A person reviews each
reply draft. After Step 3, discuss slide 14: fixed workflow (n8n Switch) vs dynamic agent (orchestrator picks
its calls).

**Common failure and fix:** if a lookup does not run, check the customer or transaction ID and the
specialist's `tools` list. Do not start `server.js`; the SDK starts it over stdio.

**Catch-up:** `git switch step-3` · `git diff origin/step-2 origin/step-3`
(or `facilitator/step-3.diff`).

**Verify:** `npm run verify` reports 26 passing tests.

**Discuss:** who reviews the reply draft?

**Timer:** 5 min demo, 15–20 min build and check.

---

## Step 4 · Acceptance table and `npm run check` (slide 27)

**Goal:** fill the acceptance table and check the labels from your runs.

**n8n then / SDK now:** the Switch routes results; the offline checker compares the entered labels.

### How the loop works here

The checker validates the labels without calling a model. It does not decide whether the draft is safe to send.

### Demo (facilitator, ~5 min)

Run `npm run check` once.
On a fresh clone, it creates an empty `labels.json`.
Fill it with labels from your own runs.
Run `npm run check` a second time.
Show one `correct` or `revise` line and the lesson totals.

**Say:** the acceptance table and `npm run check` are the Step 4 deliverables.

**Expected trace:** `MSG-01 correct` or `MSG-01 revise`, followed by the Lesson totals.

**Common failure and fix:** if the checker reports an invalid label, use only `low`, `medium`, or `high`.

### Your turn (~15–20 min)

Copy `check.mjs`, `answer-key.json` (hashes only), `labels.template.json`, and `"check": "node check.mjs"`
(`git checkout origin/step-4 -- check.mjs answer-key.json labels.template.json package.json`).

```sh
npm run check
# fill labels from your own runs
npm run check
```

**Expected format** (example, not the answers):

```text
MSG-01 correct
MSG-02 revise
Lesson 1 (MSG-01 to MSG-06): 5/6 REVISE
Lesson 3 (MSG-01 to MSG-09): 5/9 REVISE
```

Exit 0 when Lesson 1 is 6/6 and no filled-in label is wrong. `MSG-10` is not graded.

**Acceptance table:**

| Message | Agent label | Customer context (`get_customer`) | Transaction facts (`get_transaction`) | Draft reviewed by a person? |
| --- | --- | --- | --- | --- |
| MSG-01 | | | none | |
| MSG-05 | | | none | |
| MSG-07 | | | | |
| MSG-08 | | | | |
| MSG-09 | | | | |

Save the completed acceptance table in `participant-output/` or your squad's `intent.md`.

**Say:** the n8n Switch routes results. `npm run check` compares labels, but a passing check does not approve a draft.

**Common failure and fix:** if the checker reports an unknown message ID, use `MSG-01` through `MSG-09`.
Do not change labels just to pass.

**Verify:** `npm run verify` reports 21 passing tests.

**Catch-up:** `git switch step-4` (= `solution` after merge).

**Discuss:** why does a passing check not mean a draft is safe to send?

**Timer:** 5 min demo, 15–20 min build and check.

---

## Assignment · Extend the MCP: CRUD tools, hooks and a workflow

**Goal:** add write tools after Step 4. Keep the Step 3 lesson read-only.

Do the core first: Part 1 and Part 2 (about 35 minutes). Part 3 and Part 4 are stretch.
Make CORE the room target. Use STRETCH for fast squads or homework.
The assignment starters are on Step 4.

### Part 1 · CRUD tools and a transaction agent (core)

**How it works:** the MCP reads the workbook and writes to a JSON copy. Only `transaction-agent` can
change transactions. No agent gets `delete_transaction`.

**Demo (facilitator):** show the Zod input schemas and one update in the JSON copy. Run
`npm run reset:mcp` to remove the copy.

**Your turn:** add the three CRUD tools and the copy-on-write store. Add `transaction-agent` for both
backends. Give it only `get_transaction`, `update_transaction` and `add_transaction`. Keep all other
agents read-only or tool-free.

**Done when:** the smoke test covers add, update, delete and reset. The workbook stays unchanged.

### Part 2 · Conditional approval hooks (core)

**How it works:** check each agent's tool list, the orchestrator's `allowedTools`, the
`permissionMode`, and then the `PreToolUse` hook. Reads pass without a prompt. Updates below €100 pass
and write an audit line. Larger updates, adds and deletes need human approval.

**Demo (facilitator):** run `npm run hook:demo -- small`.
Use `large`, `add`, `delete`, or `read` for another case.
Show that TX-1002 (€49.99) passes and TX-1007 (€899) asks for approval.
Show that add and delete ask for approval. Show that reads pass.

**Your turn:** add shared SDK and Claude Code hooks. Check transaction IDs and statuses. Add one audit
line after each write. Stop after a denial. Do not retry or delegate the write.

**Done when:** `npm run check:assignment` checks tool access, hook setup and all five decisions.

### Part 3 · Add drafts and a fraud-check agent (stretch)

**How it works:** `save_reply_draft` saves a Markdown draft with a review header. It replaces a
draft with the same message ID. `customer-reply-agent` gets only this tool. `fraud-check-agent` gets
only read tools. Stop before a write when hold is true or risk is high.

**Demo (facilitator):** save a draft for MSG-07. Show the header and path. Show the fraud agent's
JSON result.

**Your turn:** add `drafts-server.js` and the draft tool. Use `DRAFTS_DIR`. Add `drafts` to
`.mcp.json` and assignment options only. Add `customer-reply-agent.md` with
`name: customer-reply-agent` and only the draft tool.
Add `fraud-check-agent.md` with `name: fraud-check-agent` and customer and transaction read tools.
Wire both agents in
`03-mcp/agents.mjs`. Let the hook allow and audit draft saves. Make `npm run reset:mcp` remove drafts.

**Done when:** a test saves and replaces a draft in a temporary folder. It checks the review header.
The fraud agent has only read tools.

### Part 4 · Ask a person and resolve a ticket (stretch)

**How it works:** use the built-in `AskUserQuestion` tool. Keep it in SDK `tools`, not in
`allowedTools`. Do not build a custom MCP question tool.
Ask one question when risk is medium or a fact is missing. Use interactive Claude Code with
`--allowedTools AskUserQuestion`. `claude -p` excludes the tool and reports `ESCALATE`.

**Demo (facilitator):** run `npm run resolve -- MSG-07 --backend sdk` in a TTY. MSG-07 links
CUST-007 to TX-1007, Vertex Commerce. The amount is €899. The status is FAILED. The note says
"amount appears reserved." Approve one run with `y`. Deny another run with `N`. Check that a denial
stops without a retry, another agent, or a draft.
After approval, inspect `participant-output/transactions.working.json`.
Check that `issue_details` keeps its current text and appends ` | MSG-07 (customer report): <customer claim>`.
Treat the added sentence as a customer claim, not a confirmed fact.
Check that `status` remains `FAILED`.
Check `participant-output/audit.jsonl` for the update and draft-save entries.
Check that `participant-output/drafts/MSG-07.md` starts with `DRAFT - a person reviews this before sending.`.

Run MSG-08. TX-1014 has `Fraud Flag Yes`. Check that the workflow reports `ESCALATE` and makes no
write.

Run MSG-09. CUST-004 does not match TX-1018, which belongs to Juniper Hotels. Choose Escalate in
the question. Check that the workflow makes no write. Run MSG-09 without a TTY. Check that the
workflow reports `ESCALATE`.

Run `npm run hook:demo -- small`. Use `large`, `add`, `delete`, or `read` for another case.
The small fixture uses TX-1002 (€49.99).
The large fixture uses TX-1007 (€899). No ticket fits a small update. Do not invent one.

**Your turn:** add `ask-human.mjs` for the SDK `canUseTool` callback. Give `AskUserQuestion` to the
orchestrator only. Keep it out of SDK `allowedTools`. Add the rules to `CLAUDE.md`.
Add the `resolve` CLI and `/resolve-ticket`. Call `fraud-check-agent` before a write.
Stop with `ESCALATE` when hold is true or risk is high. Save the reply with `customer-reply-agent`.
Add handler and dry-run tests. Extend `scripts/check-assignment.mjs` and its tests.

**Done when:** the dry run lists each step and branch. The handler tests cover a TTY answer and no
TTY. The checker passes on the solution branch.

Run `npm run check:assignment` after Part 2 and after Part 4.
If core items remain, the check exits 1. Fix them first.
If core passes with open stretch items, the check exits 0. Stretch is optional.
If both parts pass, the check exits 0.
Run `npm run check:assignment -- --strict` to require stretch. Open stretch items then exit 1.
Run the check on Step 4 to see missing tasks.
Run it on `solution` to see the complete reference work.

---

## Step 5 · Build your own agent

**Goal:** build a small code-fixing agent and identify its prompt, tools, and result handling.

**n8n then / SDK now:** compose a prompt, allowed tools, and an SDK query loop.

### How the loop works here

The SDK yields assistant messages, tool uses, and a final result. Allowed tools limit what the model can do;
the permission mode controls edits.

### Demo (facilitator, ~5 min)

```sh
cd 05-build-your-own
node agent.mjs --dry-run
claude -p "Find and fix the bug in utils.js. Explain the change." --allowedTools Read,Edit,Glob --permission-mode acceptEdits
```

**Say:** the SDK and Claude Code run the same task with different backends.

**Expected trace:** the dry run makes no model call. A live run reports assistant text, tool use, and a result.

**Common failure and fix:** if the dry run cannot find `utils.js`, run it from `05-build-your-own/`.

### Your turn (~15–20 min)

Use `05-build-your-own/README.md` to initialize the folder and install the SDK. Run `node agent.mjs --dry-run`
or use your Claude Code login with the command above.

**Check:** explain which message is a tool use and which is the final result.

**Catch-up:** `git switch step-4`.

**Discuss:** what prompt or tool would make this agent useful for your work?

**Timer:** 5 min demo, 15–20 min build and check.

---

## Stretch (15:30) and wrap-up (15:45, slide 28)

Stretch: run the assignment in the interactive chat:

```sh
npm run chat -- --lesson 3
```

Or use Claude Code from the repo:

```sh
claude
```

Claude Code reads `.mcp.json` and `.claude/agents/`; compare `lesson2` vs `lesson3` on `MSG-07`..`MSG-09`,
then compare the read-only transaction tools with the final assignment. Wrap up with one orchestrator,
three customer specialists, MCP tools and a person who reviews every reply draft.

## Files on this branch

- `facilitator/step-0/` … `facilitator/step-4/` — participant files at the end of each step (read-only snapshots).
- `facilitator/step-1.diff` … `facilitator/step-4.diff` — change from the previous step.
- `scripts/build-facilitator.sh` — regenerates snapshots, diffs and this guide's code blocks from the branches.
