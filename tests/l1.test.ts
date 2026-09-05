import { describe, it, expect, vi, beforeEach } from "vitest";
import { runL1 } from "../lib/layered/l1";

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
    if (body.stream) {
      const payload = JSON.stringify({ choices: [{ delta: { content: "finding one." }, finish_reason: "stop" }] });
      return new Response(`data: ${payload}\n\ndata: [DONE]\n\n`, { headers: { "Content-Type": "text/event-stream" } });
    }
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "finding one." }, finish_reason: "stop" }] }) } as unknown as Response;
  }) as unknown as typeof fetch;
});

describe("runL1", () => {
  it("returns token plus 4 analyst reports", async () => {
    const res = await runL1("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
    expect(res.token.name).toBe("Bonk");
    expect(Object.keys(res.reports).sort()).toEqual(["news", "onchain", "sentiment", "technical"]);
    expect(res.errors).toEqual([]);
  }, 60000);

  it("rejects invalid mint without any fetch", async () => {
    await expect(runL1("xxx")).rejects.toThrow("Invalid Solana mint address");
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });

  it("preserves real failure messages for the UI", async () => {
    global.fetch = vi.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes("dexscreener")) {
        return { ok: true, status: 200, json: async () => ({ pairs: [{ baseToken: { name: "Bonk", symbol: "BONK" }, priceUsd: "0.00002", priceChange: { h24: 5 }, liquidity: { usd: 1000000 } }] }) } as unknown as Response;
      }
      throw new Error("socket hang up");
    }) as unknown as typeof fetch;
    const res = await runL1("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
    expect(res.errors).toHaveLength(4);
    expect(res.errors.every((e) => e.message.length > 0)).toBe(true);
  }, 60000);

  it("marks blank reports MISSING instead of empty", async () => {
    global.fetch = vi.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes("dexscreener")) {
        return { ok: true, status: 200, json: async () => ({ pairs: [{ baseToken: { name: "Bonk", symbol: "BONK" }, priceUsd: "0.00002", priceChange: { h24: 5 }, liquidity: { usd: 1000000 } }] }) } as unknown as Response;
      }
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "  " }, finish_reason: "stop" }] }) } as unknown as Response;
    }) as unknown as typeof fetch;
    const res = await runL1("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
    expect(Object.values(res.reports).every((r) => r.includes("REPORT UNAVAILABLE"))).toBe(true);
    expect(res.errors).toHaveLength(4);
    expect(res.errors[0].message).toBe("empty report");
  });
});
