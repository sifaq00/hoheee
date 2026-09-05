import { describe, it, expect, vi, beforeEach } from "vitest";
import { runFlashAnalysis, stripToolCallXml } from "../lib/pipeline/flash";
import type { AgentEvent } from "../lib/pipeline/state";

const LLM_OK = (content: string) => ({
  choices: [{ message: { content }, finish_reason: "stop" }],
});

beforeEach(() => {
  vi.stubEnv("LLM_API_URL", "https://llm.test/v1/chat/completions");
  vi.stubEnv("LLM_API_KEY", "k");
  vi.stubEnv("LLM_MODEL", "m");
  global.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("dexscreener")) {
      return { ok: true, status: 200, json: async () => ({ pairs: [{ baseToken: { name: "Bonk", symbol: "BONK" }, priceUsd: "0.00002", priceChange: { h24: 5 }, liquidity: { usd: 1000000 } }] }) } as unknown as Response;
    }
    const body = JSON.parse(String((init as { body?: unknown })?.body ?? "{}"));
    expect(body.max_tokens).toBeLessThanOrEqual(800);
    if (body.stream) {
      const payload = JSON.stringify({
        choices: [{ delta: { content: "RATING: Hold\nCONFIDENCE: Medium\nsummary line" }, finish_reason: "stop" }],
      });
      return new Response(`data: ${payload}\n\ndata: [DONE]\n\n`, {
        headers: { "Content-Type": "text/event-stream" },
      });
    }
    return { ok: true, status: 200, json: async () => LLM_OK("RATING: Hold\nCONFIDENCE: Medium\nsummary line") } as unknown as Response;
  }) as unknown as typeof fetch;
});

describe("runFlashAnalysis", () => {
  it("emits token_found, 4 reports, 2 debate turns, decision", async () => {
    const events: AgentEvent[] = [];
    const state = await runFlashAnalysis("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", (e) => events.push(e));
    const types = events.map((e) => e.type);
    expect(types).toContain("token_found");
    expect(types.filter((t) => t === "agent_report")).toHaveLength(4);
    expect(types.filter((t) => t === "debate_turn")).toHaveLength(2);
    expect(types).toContain("decision");
    expect(state.finalDecision).toContain("RATING:");
  }, 60000);

  it("rejects invalid mint without any fetch", async () => {
    await expect(runFlashAnalysis("xxx", () => undefined)).rejects.toThrow("Invalid Solana mint address");
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });
});

describe("stripToolCallXml", () => {
  it("removes wishful tool-call blocks and collapses gaps", () => {
    const dirty =
      "Now let me get data.\n<tool_call> <function=foo> <parameter=mint>abc</parameter> </function> </tool_call>\n\n\nReal finding.";
    expect(stripToolCallXml(dirty)).toBe("Now let me get data.\n\nReal finding.");
  });

  it("leaves clean text untouched", () => {
    expect(stripToolCallXml("Just a finding.")).toBe("Just a finding.");
  });
});
