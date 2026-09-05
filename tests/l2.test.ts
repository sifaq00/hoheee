import { describe, it, expect, vi, beforeEach } from "vitest";
import { runL2 } from "../lib/layered/l2";
import { MISSING_REPORT } from "../lib/agents/types";

const MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const REPORTS = { onchain: "o", technical: "t", sentiment: "s", news: "n" };

beforeEach(() => {
  vi.stubEnv("LLM_API_URL", "https://llm.test/v1/chat/completions");
  vi.stubEnv("LLM_API_KEY", "k");
  vi.stubEnv("LLM_MODEL", "m");
  let n = 0;
  global.fetch = vi.fn(async () => {
    n += 1;
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: `arg ${n}` }, finish_reason: "stop" }] }) } as unknown as Response;
  }) as unknown as typeof fetch;
});

describe("runL2", () => {
  it("runs 2 rounds of bull then bear in order", async () => {
    const res = await runL2({ mint: MINT, reports: REPORTS, rounds: 2 });
    expect(res.debate.map((d) => `${d.round}:${d.side}`)).toEqual(["1:bull", "1:bear", "2:bull", "2:bear"]);
    expect(res.errors).toEqual([]);
  });

  it("marks MISSING reports honestly and continues when one side fails", async () => {
    let calls = 0;
    global.fetch = vi.fn(async () => {
      calls += 1;
      if (calls >= 2 && calls <= 5) throw new Error("boom");
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }] }) } as unknown as Response;
    }) as unknown as typeof fetch;
    const res = await runL2({ mint: MINT, reports: { ...REPORTS, news: MISSING_REPORT }, rounds: 1 });
    expect(res.debate).toHaveLength(1);
    expect(res.errors.map((e) => e.agent)).toEqual(["bear"]);
  });
});
