/**
 * cli.ts — LESSON 3a (given) · local, reproducible entry point — used for the Lesson 5 handoff
 * ---------------------------------------------------------------------------
 *   npm run triage -- fixtures/ticket.json
 *   npm run triage -- fixtures/ticket.json --dry-run          (no memory write)
 *   npm run triage -- fixtures/ticket.json --max-turns 2      (loop budget)
 *   npm run triage -- fixtures/ticket.json --out participant-output/wl-1026.json
 *   AGENT_MODEL=sonnet npm run triage -- fixtures/ticket.json      (real Claude Agent SDK run)
 *
 * n8n equivalent: "When clicking 'Execute workflow'" + "Ticket Input".
 * Nothing is sent anywhere: the output is a draft for a human.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { runTriage } from "./agent.js";
import { memoryStore } from "./memory.js";
import { resolveRuntime, type AgentEvent } from "./runtime.js";
import { parseJson, parseTicket } from "./router.js";

/**
 * Print human-readable progress, like the Agent SDK quickstart:
 * Claude's text, each tool call, and the final result.
 */
const printMessage = (message: AgentEvent): void => {
  if (message.type === "assistant" && message.parent_tool_use_id === null) {
    for (const block of message.message.content) {
      if (block.type === "text" && block.text) console.log(block.text);
      if (block.type === "tool_use") {
        const input = (block.input ?? {}) as { subagent_type?: string };
        console.log(`Tool: ${block.name}${input.subagent_type ? ` → ${input.subagent_type}` : ""}`);
      }
    }
  } else if (message.type === "result") {
    console.log(`Done: ${message.subtype}`);
  }
};

const main = async (): Promise<number> => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      out: { type: "string" },
      model: { type: "string" },
      "max-turns": { type: "string" },
      "max-budget-usd": { type: "string" },
    },
  });

  const inputPath = positionals[0] ?? "fixtures/ticket.json";
  const json = parseJson(await readFile(inputPath, "utf8"));
  const ticket = json.ok ? parseTicket(json.value) : json;
  if (!ticket.ok) {
    console.error(`FAIL input ${inputPath}\n  - ${ticket.errors.join("\n  - ")}`);
    return 1;
  }

  const maxTurns = values["max-turns"] === undefined ? undefined : Number(values["max-turns"]);
  if (maxTurns !== undefined && !(Number.isInteger(maxTurns) && maxTurns >= 1)) {
    console.error(`FAIL --max-turns must be a whole number ≥ 1 (got ${values["max-turns"]})`);
    return 1;
  }

  const runtime = resolveRuntime(values.model);
  console.log(`▶ ticket ${ticket.value.ticket_id} · runtime ${runtime.label}`);

  const run = await runTriage(ticket.value, {
    query: runtime.query,
    model: runtime.model,
    modelLabel: runtime.label,
    memory: memoryStore(),
    writeMemory: !values["dry-run"],
    onMessage: printMessage,
    ...(maxTurns !== undefined ? { maxTurns } : {}),
    ...(values["max-budget-usd"] ? { maxBudgetUsd: Number(values["max-budget-usd"]) } : {}),
  });
  console.log(`loop: ${run.turns ?? "?"} turn(s) used · maxTurns ${run.maxTurns}`);

  console.log("\n── trace (subagent calls) ──");
  run.trace.forEach((t, i) => console.log(`${i + 1}. ${t.tool}: ${t.output}`));

  if (!run.result.ok) {
    console.error(`\nFAIL contract\n  - ${run.result.errors.join("\n  - ")}`);
    console.error(`\nraw model text:\n${run.rawText}`);
    return 1;
  }

  const output = JSON.stringify(run.result.value, null, 2);
  console.log(`\n── routed draft ──\n${output}`);
  if (values.out) {
    await mkdir(dirname(values.out), { recursive: true });
    await writeFile(values.out, `${output}\n`, "utf8");
    console.log(`\nsaved ${values.out}`);
  }
  if (run.memoryFile) console.log(`memory appended → ${run.memoryFile}`);
  if (run.costUsd) console.log(`estimated cost: $${run.costUsd.toFixed(4)}`);
  console.log("\nPASS contract · OPEN: a human must review this draft before any action.");
  return 0;
};

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
