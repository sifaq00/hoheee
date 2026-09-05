import { describe, it, expect, vi, beforeEach } from "vitest";
import { runL4 } from "../lib/layered/l4";
import { mintChain } from "../lib/layered/chain";
import { loadReport } from "../lib/layered/supabase";

const MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const RISKS = { liquidity: "thin", rugpath: "auth revoked", concentration: "whales" };
const INPUT = {
  chain: "solana" as const,
  mint: MINT,
  model: "mimo-v2.5",
  token: { name: "Bonk", price: "0.00002", liquidity: 1000000, change24h: 5 },
  symbol: "BONK",
  reports: { onchain: "o", technical: "t", sentiment: "s", news: "n" },
  debate: [{ phase: "invest" as const, round: 1, side: "bull" as const, text: "up" }],
  risks: RISKS,
  chainToken: mintChain("l3", "solana", MINT, RISKS),
};

beforeEach(() => {
  vi.stubEnv("LLM_API_URL", "https://llm.test/v1/chat/completions");
  vi.stubEnv("LLM_API_KEY", "k");
  vi.stubEnv("LLM_MODEL", "mimo-v2.5");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://db.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "srv");
  global.fetch = vi.fn(async (url: unknown) => {
    const u = String(url);
    if (u.includes("db.test")) {
      return { ok: true, status: 201, json: async () => [{ id: "11111111-1111-4111-8111-111111111111" }] } as unknown as Response;
    }
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "RATING: Hold\nCONFIDENCE: Medium\nKEY RISKS:\n- thin\nEXECUTIVE SUMMARY\nok\nINVESTMENT THESIS\nfair" }, finish_reason: "stop" }] }) } as unknown as Response;
  }) as unknown as typeof fetch;
});

describe("runL4", () => {
  it("decides, parses rating, saves, returns share id", async () => {
    const res = await runL4(INPUT);
    expect(res.rating).toBe("Hold");
    expect(res.confidence).toBe("Medium");
    expect(res.id).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("retries once when decider returns blank, then succeeds", async () => {
    let calls = 0;
    global.fetch = vi.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes("db.test")) {
        return { ok: true, status: 201, json: async () => [{ id: "11111111-1111-4111-8111-111111111111" }] } as unknown as Response;
      }
      calls += 1;
      const content = calls === 1 ? "   " : "RATING: Hold\nCONFIDENCE: Medium\nKEY RISKS:\n- thin\nEXECUTIVE SUMMARY\nok\nINVESTMENT THESIS\nfair";
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content }, finish_reason: "stop" }] }) } as unknown as Response;
    }) as unknown as typeof fetch;
    const res = await runL4(INPUT);
    expect(res.rating).toBe("Hold");
  });

  it("throws honest error without saving when decider is empty", async () => {
    global.fetch = vi.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes("db.test")) throw new Error("must not save");
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "   " }, finish_reason: "stop" }] }) } as unknown as Response;
    }) as unknown as typeof fetch;
    await expect(runL4(INPUT)).rejects.toThrow("empty decision");
  });
});

describe("loadReport", () => {
  it("returns row from Supabase REST", async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, json: async () => [{ id: "11111111-1111-4111-8111-111111111111", decision: "RATING: Hold" }] })) as unknown as typeof fetch;
    const row = await loadReport("11111111-1111-4111-8111-111111111111", { url: "https://db.test", anonKey: "anon", fetchFn });
    expect((row as { decision: string }).decision).toContain("RATING:");
  });

  it("returns null on 404 without throwing", async () => {
    const fetchFn = vi.fn(async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
    await expect(loadReport("missing", { url: "https://db.test", anonKey: "anon", fetchFn })).resolves.toBeNull();
  });

  it("returns null without config instead of throwing", async () => {
    await expect(loadReport("11111111-1111-4111-8111-111111111111", { url: undefined, anonKey: undefined })).resolves.toBeNull();
  });
});
