import { describe, it, expect, vi, beforeEach } from "vitest";
import { MISSING_REPORT } from "../lib/agents/types";
import { runL3 } from "../lib/layered/l3";

const INPUT = {
  mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  reports: { onchain: "o", technical: "t", sentiment: "s", news: "n" },
  debate: [{ phase: "invest" as const, round: 1, side: "bull" as const, text: "up" }],
};

beforeEach(() => {
  vi.stubEnv("LLM_API_URL", "https://llm.test/v1/chat/completions");
  vi.stubEnv("LLM_API_KEY", "k");
  vi.stubEnv("LLM_MODEL", "m");
  global.fetch = vi.fn(async () => {
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "risk note." }, finish_reason: "stop" }] }) } as unknown as Response;
  }) as unknown as typeof fetch;
});

describe("runL3", () => {
  it("returns 3 parallel risk notes keyed by slot", async () => {
    const res = await runL3(INPUT);
    expect(Object.keys(res.risks).sort()).toEqual(["concentration", "liquidity", "rugpath"]);
    expect(res.errors).toEqual([]);
  });

  it("rejects invalid mint without any fetch", async () => {
    await expect(runL3({ ...INPUT, mint: "xxx" })).rejects.toThrow("Invalid Solana mint address");
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });

  it("returns MISSING_REPORT for all slots when all LLM calls fail", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      throw new Error("llm down");
    });
    const res = await runL3(INPUT);
    expect(Object.values(res.risks).every((v) => v === MISSING_REPORT)).toBe(true);
    expect(res.errors.length).toBe(3);
  });
});
