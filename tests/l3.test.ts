import { describe, it, expect, vi, beforeEach } from "vitest";
import { MISSING_REPORT } from "../lib/agents/types";
import { mintChain } from "../lib/layered/chain";
import { runL3 } from "../lib/layered/l3";

const MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const DEBATE = [{ phase: "invest" as const, round: 1, side: "bull" as const, text: "up" }];
const INPUT = {
  mint: MINT,
  reports: { onchain: "o", technical: "t", sentiment: "s", news: "n" },
  debate: DEBATE,
  chain: mintChain("l2", MINT, DEBATE),
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
    expect(typeof res.chain).toBe("string");
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

  it("returns MISSING_REPORT for failed slot only when one LLM call fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (_url: unknown, init: { body?: unknown }) => {
      const body = JSON.parse(init.body as string) as { messages: { content: string }[] };
      if (body.messages[0].content.includes("liquidity-risk")) throw new Error("slot down");
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "risk note." }, finish_reason: "stop" }] }) } as unknown as Response;
    });
    const res = await runL3(INPUT);
    expect(res.risks.liquidity).toBe(MISSING_REPORT);
    expect(res.risks.concentration).toBe("risk note.");
    expect(res.risks.rugpath).toBe("risk note.");
    expect(res.errors.length).toBe(1);
    expect(res.errors[0].agent).toBe("risk:liquidity");
  });
});
