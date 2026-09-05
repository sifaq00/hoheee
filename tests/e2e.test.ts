import { describe, expect, it } from "vitest";

const MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const BASE = "http://localhost:3000";

describe("analysis pipeline e2e", () => {
  it("full run emits all event types plus a decision", async () => {
    const res = await fetch(`${BASE}/api/analyze`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mint: MINT }),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    for (const t of ["token_found", "agent_start", "tool_call", "tool_result", "agent_report", "debate_turn", "decision", "done"]) {
      expect(text).toContain(`event: ${t}`);
    }
    // 4 analyst reports share the agent_report channel
    const lines = text.split("\n");
    const agents: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === "event: agent_report" && lines[i + 1]?.startsWith("data: ")) {
        agents.push((JSON.parse(lines[i + 1].slice(6)) as { agent: string }).agent);
      }
    }
    expect(agents.sort()).toEqual(["news", "onchain", "sentiment", "technical"]);
    const decision = text.split("event: decision\n")[1]?.split("\n\n")[0];
    expect(decision).toBeTruthy();
  });
});
