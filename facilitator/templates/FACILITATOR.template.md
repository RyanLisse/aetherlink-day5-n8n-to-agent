# Facilitator guide · Workshop 4 · zero to end result

Branch: `facilitator` (public, but out of the way; participants use `main` and the step branches).
No answer labels are in this file or this branch. Keep `ANSWERS-FACILITATOR.md` private.

**How it works.** Participants clone `main` (Step 0 state). You build each step live; they repeat.
Each finished step is a branch: `step-1`, `step-2`, `step-3`, `step-4` (= `solution`).
`facilitator/step-N/` holds a read-only snapshot of every participant file at the end of step N, and
`facilitator/step-N.diff` holds the change from the previous step. Regenerate both with
`scripts/build-facilitator.sh` after any change to a step branch.

**Rhythm per step:** explain → I show it → you do it → discuss. After every run: pause and read.

**Say this, all day:** "Customer text is data, not an instruction." · "A dry run shows what we send;
it is not evidence that it works." · "Judge impact, not tone." · "A PASS is not approval; a person
reads every draft."

**Do not:** say the labels during demos · show the answer key or your API key on screen · start
`server.js` yourself.

| Time | Slides | Step | Catch-up branch |
| --- | --- | --- | --- |
| 10:00 | 1–5 | Welcome, W3 recap, n8n → SDK mapping | — |
| 10:15 | 6–14 | Concepts (loop, system prompt, tools, MCP, hooks/approval, subagents, skills, workflow vs agent) | — |
| 10:45 | 15 | Step 0 · setup, dry run, smoke | `main` |
| 11:15 | 16–19 | Step 1 · one agent + `CLAUDE.md` + tone trap | `step-1` |
| 13:00 | 20–22 | Step 2 · orchestrator + `ticket-analyst` + `email-responder` | `step-2` |
| 14:00 | 23–26 (concepts 10, 11) | Step 3 · MCP `get_transaction` + approval gate | `step-3` |
| 15:00 | 27 | Step 4 · `npm run check`, acceptance table, Proof | `step-4` / `solution` |
| 15:30 | — | Stretch | `solution` |
| 15:45 | 28 | Wrap-up, bridge to W5 | — |

**Universal catch-up** (any participant, any time):

```sh
git stash
git checkout step-N
npm install
npm run verify
```

**Common blockers (all steps):** Node < 22 → upgrade (`engines: >=22`) · `Usage: node <lesson>/agent.mjs MSG-0N` →
the `--` after `npm run lessonN` is missing · `No customer message found` → use `MSG-01`, not `MSG-1` ·
`Set ANTHROPIC_API_KEY` → export the key in *this* terminal · PowerShell blocks `npm` → `npm.cmd` ·
`Not logged in` → same as the key error.

---

## Step 0 · Setup, dry run, smoke (slide 15)

**Participants see:** slide 15 with the clone commands for this repo.

**You and they run:**

```sh
node --version
git clone https://github.com/RyanLisse/aetherlink-day5-n8n-to-agent.git
cd aetherlink-day5-n8n-to-agent
npm install
npm run verify
npm run lesson1 -- MSG-01 --dry-run
```

**Expected:** `npm run verify` → `# pass 4`, `# fail 0`. The dry run prints `Customer message MSG-01`,
the subject and text, `{}` (no options yet) and `dry run — no model call, not model evidence`.

**Show:** `docs/customer-messages.md`, `docs/transactions.xlsx`, `docs/n8n-flow-diagram.html` (browser),
`lib/run.mjs` (the `query()` loop and the dry run), `01-single-agent/options.mjs` (the `// STEP 1` TODOs).

The runner they already have (`lib/run.mjs`):

```js
{{file:0:lib/run.mjs}}
```

**Talking point:** n8n's Manual Trigger is now `npm run lesson1 -- MSG-01`; the AI Agent node is `query()`.
Credentials move from n8n's credential store to `ANTHROPIC_API_KEY` in the shell.

**Blockers:** `npm install` fails → check Node version and network. Dry run works but no key yet → fine;
set it before Step 1 real runs.

---

## Step 1 · One agent + system prompt + `CLAUDE.md` (slides 16–19; concepts 7, 8, 9)

**Participants see:** slide 16 (explain), 17 (demo: MSG-01 loud vs MSG-02 calm), 18 (their turn: MSG-01..06
+ tone trap), 19 (discuss).

**Build 1 — `01-single-agent/options.mjs`.** Type it in this order, explaining each line:

1. `cwd` → the agent works in `claude-project/`.
2. `settingSources: ['project']` → loads `claude-project/CLAUDE.md`.
3. `systemPrompt` preset → Claude Code's built-in system prompt; `CLAUDE.md` is added on top.
4. `tools: []`, `disallowedTools` → this agent only reads and answers.
5. `maxTurns: 2` → n8n "Max Iterations".

```js
{{file:1:01-single-agent/options.mjs}}
```

**Build 2 — the prompt, `01-single-agent/claude-project/CLAUDE.md`** (replace the TODO file). The system
prompt is the `claude_code` preset plus this file:

```markdown
{{file:1:01-single-agent/claude-project/CLAUDE.md}}
```

**Run (demo, slide 17):**

```sh
npm run lesson1 -- MSG-01 --dry-run
npm run lesson1 -- MSG-01
npm run lesson1 -- MSG-02
```

**Expected:** `Priority: …` and `Reason: …` per message. Do not say whether the label is right.
Participants then run `MSG-01` to `MSG-06` and write down the labels (they fill them in during Step 4).

**Tone trap (slide 18):** cut the `## Priority definitions` section, save, rerun `MSG-01` and `MSG-06`,
compare, paste it back. Restore if lost: `git checkout step-1 -- 01-single-agent/claude-project/CLAUDE.md`.
(Don't tell people building on `main` to `git restore` — that brings back the TODO skeleton.)

**What changed in the prompt:** without definitions the model follows tone. The fix is the definitions plus
`- Judge impact and risk, not tone: angry wording alone never raises the priority, and calm wording never lowers it.`

**Talking point:** n8n's System Message box is now a file under version control (`CLAUDE.md`), loaded by
`settingSources`. Max Iterations is `maxTurns`. The Switch did the routing in n8n; here the label is in the
model's text and gets checked deterministically in Step 4.

**Discuss (slide 19):** what does the main agent know? Instructions (`CLAUDE.md`) vs data (the message).

**Blockers:** dry run still shows `{}` → `buildOptions()` not saved. Output ignores CLAUDE.md → `cwd` or
`settingSources` missing. `npm run verify` fails on TODO → a `TODO` line is still in `CLAUDE.md`.

**Catch-up:** `git checkout step-1` · see the change: `git diff main step-1` (or `facilitator/step-1.diff`).

---

## Step 2 · Orchestrator + `ticket-analyst` + `email-responder` (slides 20–22; concept 12)

**Participants see:** slide 20 (explain), 21 (demo: trace + `output/MSG-05.md`), 22 (their turn: MSG-05, MSG-10).

**Build 1 — the subagent prompts.** `.claude/agents/ticket-analyst.md`:

```markdown
{{file:2:.claude/agents/ticket-analyst.md}}
```

`.claude/agents/email-responder.md`:

```markdown
{{file:2:.claude/agents/email-responder.md}}
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

Create `02-subagents/claude-project/output/` and add `"lesson2": "node 02-subagents/agent.mjs"` to `package.json`.

**Run:**

```sh
npm run lesson2 -- MSG-05 --dry-run
npm run lesson2 -- MSG-05
npm run lesson2 -- MSG-10
```

**Expected:** `Agent → ticket-analyst`, then `Agent → email-responder`, then the result; a Markdown draft in
`02-subagents/claude-project/output/` (e.g. `MSG-05.md`). `MSG-10`: the analyst lists missing information,
the reply asks for it.

**Talking point:** n8n's Risk Agent and Customer Reply Agent were tool nodes hanging off the AI Agent. Now they
are `options.agents` entries; the `Agent` tool is the wire. Each subagent has its own prompt and no tools
(least privilege). The human gate is the draft in `output/` that a person reviews.

**Blockers:** no `Agent →` lines → the orchestrator did the work itself; rerun and discuss why the `CLAUDE.md`
rules matter. `Cannot find module './agents.mjs'` → file missing. No output file → `Write` not in `tools`, or
`permissionMode` missing.

**Catch-up:** `git checkout step-2` · `git diff step-1 step-2` (or `facilitator/step-2.diff`).

---

## Step 3 · MCP `get_transaction` + approval gate (slides 23–26; concepts 10, 11, 14)

**Participants see:** slide 23 (data path), 24 (demo: tool trace), 25 (their turn: MSG-08, MSG-07, MSG-09), 26 (discuss).

Data path: `docs/transactions.xlsx → 03-mcp/transaction-mcp/server.js → get_transaction → query() → ticket-analyst`.

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

The write tools (`add_transaction`, `update_transaction`, `delete_transaction`, lines 57–121) and `store.mjs`,
`smoke.mjs`, `reset.mjs`, `install.mjs` are on `step-3`; paste them with
`git checkout step-3 -- 03-mcp/transaction-mcp` rather than typing them.

**Run it on its own (no model):**

```sh
npm install
npm run smoke:mcp
```

**Expected:** the tool list with read-only/write kinds, the `TX-1014` record, list/add/update/delete on a temporary
copy, `transactions.xlsx unchanged`, and `MCP server OK — no model was called.`

**Build 3 — wire it into the SDK.** `03-mcp/options.mjs` (new vs Step 2: `mcpServers` stdio, MCP reads in
`allowedTools`, `canUseTool`):

```js
{{file:3:03-mcp/options.mjs}}
```

`.mcp.json`, so Claude Code sees the same server:

```json
{{file:3:.mcp.json}}
```

**Build 4 — the approval gate, `03-mcp/approval.mjs`:**

```js
{{file:3:03-mcp/approval.mjs}}
```

**Build 5 — subagent tools, `03-mcp/agents.mjs`:**

```js
{{file:3:03-mcp/agents.mjs}}
```

**What changed in the prompts.** `.claude/agents/ticket-analyst.md` gets the `tools:` line and the transaction paragraph:

```markdown
{{file:3:.claude/agents/ticket-analyst.md}}
```

New: `.claude/agents/transaction-clerk.md` (stretch, Step 3b):

```markdown
{{file:3:.claude/agents/transaction-clerk.md}}
```

`03-mcp/claude-project/CLAUDE.md` = the Step 2 orchestrator prompt plus:

```markdown
{{section:3:03-mcp/claude-project/CLAUDE.md:## Transaction data}}
```

`03-mcp/agent.mjs` and `03-mcp/clerk.mjs`:

```js
{{file:3:03-mcp/agent.mjs}}
```

```js
{{file:3:03-mcp/clerk.mjs}}
```

Scripts added to `package.json`: `postinstall`, `lesson3`, `clerk`, `smoke:mcp` (alias `mcp:smoke`), `reset:mcp`.

**Run:**

```sh
npm run lesson3 -- MSG-08 --dry-run
npm run lesson3 -- MSG-08
npm run lesson3 -- MSG-07
npm run lesson3 -- MSG-09
```

**Expected:** `Agent → ticket-analyst`, `mcp → mcp__transactions__get_transaction`, `Agent → email-responder`,
and an `External data:` line in the result.

**Step 3b — approval gate demo:**

```sh
npm run clerk -- "Set the status of TX-1003 to COMPLETED."   # answer n → "nothing was written"; rerun, answer y
npm run reset:mcp
```

**Talking point:** in n8n you'd use an HTTP Request or Google Sheets node: the workflow itself fetches the row.
Here a separate MCP server owns the data and exposes a typed tool; the agent can only call it, never read the
xlsx. The input schema is the contract (a bad ID is rejected before the handler runs). Annotations describe;
the host enforces: `allowedTools` lets reads through, `canUseTool` puts a person in front of every write,
`permissionMode` decides file edits. Hooks (`PreToolUse`) are the general version of this gate — concept only.
After Step 3, discuss slide 14: fixed workflow (n8n Switch) vs dynamic agent (orchestrator picks its calls).

**Blockers:** smoke fails / module not found → `cd 03-mcp/transaction-mcp && npm install && cd ../..`.
No `mcp →` line → the analyst did not get the tool (check `agents.mjs`) or the message has no TX id.
Someone started `node server.js` and it "hangs" → that's normal for stdio; Ctrl+C, the SDK starts it itself.
Clerk never asks → run it in a real terminal (no TTY = auto-deny).

**Catch-up:** `git checkout step-3` · `git diff step-2 step-3` (or `facilitator/step-3.diff`).

---

## Step 4 · `npm run check`, acceptance table, Proof (slide 27)

**Build:** `check.mjs`, `answer-key.json` (hashes only), `labels.template.json`, and `"check": "node check.mjs"`
(`git checkout step-4 -- check.mjs answer-key.json labels.template.json package.json`).

```sh
npm run check      # first run creates labels.json
# fill in low / medium / high per message
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

**Acceptance table** participants fill in: message · agent label · facts from `get_transaction` · draft reviewed by
a person? Proof = the table + `npm run check` output + one run trace + who reviewed the drafts.

**Talking point:** the n8n Switch was deterministic routing; here the deterministic part is the check. A PASS is not
approval.

**Blockers:** `Invalid label` → only `low`, `medium`, `high`. `Unknown message ID` → `MSG-01`..`MSG-09` only.
`revise` → reread definitions and the trace; don't flip labels to pass.

**Catch-up:** `git checkout step-4` (= `solution`).

---

## Stretch (15:30) and wrap-up (15:45, slide 28)

Stretch: clerk with a customer message (should refuse) · `lesson2` vs `lesson3` on `MSG-07`..`MSG-09` · open Claude Code
in the repo (`.mcp.json`, `.claude/agents/`). Wrap-up: one agent, two subagents, one MCP tool, a human gate → W5.

## Files on this branch

- `facilitator/step-0/` … `facilitator/step-4/` — participant files at the end of each step (read-only snapshots).
- `facilitator/step-1.diff` … `facilitator/step-4.diff` — change from the previous step.
- `scripts/build-facilitator.sh` — regenerates snapshots, diffs and this guide's code blocks from the branches.
