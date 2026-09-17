/**
 * STEP 0 · observe the source before translating it.
 * These tests pin down what the n8n export actually contains — including the
 * gaps we fix later. If someone "silently fixes" the export, these fail.
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

interface N8nNode {
  readonly name: string;
  readonly type: string;
  readonly parameters: Record<string, unknown>;
}
interface N8nWorkflow {
  readonly nodes: readonly N8nNode[];
  readonly connections: Record<string, Record<string, readonly (readonly { node: string }[])[]>>;
}

const flow = JSON.parse(readFileSync("n8n/support-triage.json", "utf8")) as N8nWorkflow;
const byName = (name: string): N8nNode | undefined => flow.nodes.find((n) => n.name === name);
const targetsOf = (from: string, kind: string): string[] =>
  (flow.connections[from]?.[kind] ?? []).flat().map((c) => c.node);

describe("n8n source · what it promises", () => {
  it("wires exactly two specialist tools into the AI Agent", () => {
    const tools = flow.nodes.filter((n) => n.type.endsWith(".agentTool")).map((n) => n.name);
    assert.deepEqual(tools.sort(), ["Customer Reply Agent", "Risk Agent"]);
    tools.forEach((t) => assert.deepEqual(targetsOf(t, "ai_tool"), ["AI Agent"]));
  });

  it("parses the agent output before the Switch", () => {
    assert.deepEqual(targetsOf("AI Agent", "main"), ["Code in JavaScript"]);
    assert.deepEqual(targetsOf("Code in JavaScript", "main"), ["Switch"]);
  });

  it("uses the WL-1026 ticket as input", () => {
    assert.match(String(byName("Ticket Input")?.parameters.jsonOutput), /WL-1026/);
  });

  it("contains no credentials", () => {
    assert.doesNotMatch(JSON.stringify(flow), /"credentials"/);
  });
});

describe("n8n source · the gaps intent.md must name", () => {
  it("[gap] the final JSON prompt does not ask for ticket_id", () => {
    const prompt = String(byName("AI Agent")?.parameters.text);
    assert.match(prompt, /"risk_note"/);
    assert.doesNotMatch(prompt, /ticket_id/);
  });

  it("[gap] memory nodes use static session keys (1, 2, 1)", () => {
    const keys = flow.nodes
      .filter((n) => n.type.endsWith(".memoryBufferWindow"))
      .map((n) => n.parameters.sessionKey);
    assert.deepEqual(keys, ["1", "2", "1"]);
  });

  it("[gap] action Set nodes use UPPERCASE labels", () => {
    const actions = ["Low Priority Action", "Medium Priority Action", "High Priority Action"].map(
      (n) => /"action": "(\w+)"/.exec(String(byName(n)?.parameters.jsonOutput))?.[1],
    );
    assert.deepEqual(actions, ["AUTO_REPLY", "INVESTIGATE", "ESCALATE"]);
  });
});
