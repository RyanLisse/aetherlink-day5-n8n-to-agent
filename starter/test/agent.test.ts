/** STARTER · LESSON 4 — copy to test/agent.test.ts and turn each todo into a test (node:test). */
import { describe, it } from "node:test";

describe("runTriage · happy path (offline runtime)", () => {
  it.todo("calls both subagents exactly once and routes high → escalate");
  it.todo("copies risk_note verbatim from the risk subagent");
  it.todo("passes systemPrompt, prompt, tools/agents and memory to query()");
  it.todo("locks the run down: dontAsk, settingSources [], outputFormat");
  it.todo("writes memory/<ticket_id>.md after a valid run and reads it next time");
  it.todo("does not write memory on a dry run");
});

describe("runTriage · rejects bad behaviour", () => {
  it.todo("fails when the coordinator skips the subagents, even with a valid decision");
  it.todo("fails when the SDK run does not succeed");
  it.todo("flags duplicate and unknown calls");
  it.todo("treats an adversarial message as data");
});
