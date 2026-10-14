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
{{file:0:lib/run.mjs}}
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
{{file:1:01-single-agent/priority-schema.mjs}}
```

**Build 1 — `01-single-agent/options.mjs`.** Type it in this order, explaining each line:

1. `cwd` → the agent works in `claude-project/`.
2. `settingSources: ['project']` → loads `claude-project/CLAUDE.md`.
3. `systemPrompt` preset → Claude Code's built-in system prompt; `CLAUDE.md` is added on top.
4. `tools: []`, `disallowedTools` → this agent only reads and answers.
5. `maxTurns: 3` and `outputFormat` → bounded turns and a validated priority result.

```js
{{file:1:01-single-agent/options.mjs}}
```

**Build 2 — the prompt, `01-single-agent/claude-project/CLAUDE.md`** (replace the TODO file). The system
prompt is the `claude_code` preset plus this file:

```markdown
{{file:1:01-single-agent/claude-project/CLAUDE.md}}
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
{{file:2:.claude/agents/risk-agent.md}}
```

`.claude/agents/customer-reply-agent.md`:

```markdown
{{file:2:.claude/agents/customer-reply-agent.md}}
```

**Build 2 — load them into `options.agents`.** `lib/agents.mjs`:

```js
{{file:2:lib/agents.mjs}}
```

`02-subagents/agents.mjs`:

```js
{{file:2:02-subagents/agents.mjs}}
```

**Build 3 — the orchestrator.** `02-subagents/options.mjs` (new lines vs Step 1: `agents`, `tools: ['Agent', 'Write']`,
`allowedTools`, `permissionMode: 'acceptEdits'`, `maxTurns: 10`):

```js
{{file:2:02-subagents/options.mjs}}
```

`02-subagents/agent.mjs`:

```js
{{file:2:02-subagents/agent.mjs}}
```

The orchestrator prompt, `02-subagents/claude-project/CLAUDE.md`:

```markdown
{{file:2:02-subagents/claude-project/CLAUDE.md}}
```

`02-subagents/ticket-schema.mjs` defines the structured ticket output. The branch also adds the
`lesson2` dry run to `verify` and the Step 2 tests; keep `02-subagents/claude-project/output/.gitkeep`.

```js
{{file:2:02-subagents/ticket-schema.mjs}}
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
{{file:3:03-mcp/transaction-mcp/package.json}}
```

The root `package.json` installs it via `"postinstall": "node 03-mcp/transaction-mcp/install.mjs"`.
Where the data lives, `03-mcp/transaction-mcp/paths.mjs`:

```js
{{file:3:03-mcp/transaction-mcp/paths.mjs}}
```

Rows to records, `03-mcp/transaction-mcp/transactions.mjs` (first part; the rest is the stretch write logic):

```js
{{lines:3:03-mcp/transaction-mcp/transactions.mjs:1-24}}
```

**Build 2 — the server, `03-mcp/transaction-mcp/server.js`, line by line.**

Imports and setup:

```js
{{lines:3:03-mcp/transaction-mcp/server.js:1-24}}
```

Read the workbook (only the server touches the xlsx) and the result helpers:

```js
{{lines:3:03-mcp/transaction-mcp/server.js:26-33}}
```

The tool: name, description, input schema (the contract), annotations, handler:

```js
{{lines:3:03-mcp/transaction-mcp/server.js:48-55}}
```

`list_transactions` (cheap, read-only):

```js
{{lines:3:03-mcp/transaction-mcp/server.js:35-46}}
```

Connect over stdio:

```js
{{lines:3:03-mcp/transaction-mcp/server.js:123-123}}
```

Customer lookup, `03-mcp/transaction-mcp/customers.js`, reads the CSV (default
`docs/customer_context.csv`, override `CUSTOMER_CONTEXT_CSV`) and exposes only `get_customer`:

```js
{{file:3:03-mcp/transaction-mcp/customers.js}}
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
{{file:3:03-mcp/options.mjs}}
```

`.mcp.json`, so Claude Code sees the same server:

```json
{{file:3:.mcp.json}}
```

**Build 5 — subagent tools, `03-mcp/agents.mjs`:**

```js
{{file:3:03-mcp/agents.mjs}}
```

**What changed in the prompts.** `.claude/agents/risk-agent.md` gets the `tools:` line, the transaction
lookup paragraph and the customer-context rule:

```markdown
{{file:3:.claude/agents/risk-agent.md}}
```

New: `.claude/agents/customer-context-agent.md`:

```markdown
{{file:3:.claude/agents/customer-context-agent.md}}
```

`03-mcp/claude-project/CLAUDE.md` coordinates all three specialists and adds customer and transaction
data rules:

```markdown
{{file:3:03-mcp/claude-project/CLAUDE.md}}
```

`03-mcp/agent.mjs`:

```js
{{file:3:03-mcp/agent.mjs}}
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

### Part 1 · CRUD tools and a transaction agent

**How it works:** the MCP reads the workbook and writes to a JSON copy. Only `transaction-agent` can
change transactions. No agent gets `delete_transaction`.

**Demo (facilitator):** show the Zod input schemas and one update in the JSON copy. Run
`npm run reset:mcp` to remove the copy.

**Your turn:** add the three CRUD tools and the copy-on-write store. Add `transaction-agent` for both
backends. Give it only `get_transaction`, `update_transaction` and `add_transaction`. Keep all other
agents read-only or tool-free.

**Done when:** the smoke test covers add, update, delete and reset. The workbook stays unchanged.

### Part 2 · Conditional approval hooks

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

### Part 3 · Add drafts and a fraud-check agent

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

### Part 4 · Ask a person and resolve a ticket

**How it works:** use the built-in `AskUserQuestion` tool. Keep it in SDK `tools`, not in
`allowedTools`. Do not build a custom MCP question tool.
Ask one question when risk is medium or a fact is missing. Use interactive Claude Code with
`--allowedTools AskUserQuestion`. `claude -p` excludes the tool and reports `ESCALATE`.

**Demo (facilitator):** run `npm run resolve -- MSG-07 --backend sdk` in a TTY. MSG-07 links
CUST-007 to TX-1007, Vertex Commerce. The amount is €899. The status is FAILED. The note says
"amount appears reserved." Approve one run with `y`. Deny another run with `N`. Check that a denial
stops without a retry, another agent, or a draft.

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

Run `npm run check:assignment` on Step 4 to see missing tasks.
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
