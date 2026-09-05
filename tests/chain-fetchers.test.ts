import { describe, it, expect, vi, beforeEach } from "vitest";
import { getGoplusRisk } from "../lib/tools/goplus";
import { getTokenSummaryFor } from "../lib/tools/dexscreener";

const USDT = "0xdac17f958d2ee523a2206206994597c13d831ec7";

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("chain fetchers", () => {
  it("routes DexScreener by chain id and reads array shape", async () => {
    let seenUrl = "";
    global.fetch = vi.fn(async (url: unknown) => {
      seenUrl = String(url);
      return {
        ok: true,
        status: 200,
        json: async () => [{ baseToken: { name: "Tether USD", symbol: "USDT" }, priceUsd: "1.0", priceChange: { h24: 0 }, liquidity: { usd: 5000000 } }],
      } as unknown as Response;
    }) as unknown as typeof fetch;
    const s = await getTokenSummaryFor("ethereum", USDT);
    expect(seenUrl).toContain("/tokens/v1/ethereum/");
    expect(s?.name).toBe("Tether USD");
  });

  it("maps GoPlus security fields", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        code: 1,
        result: { [USDT]: { token_name: "Tether USD", token_symbol: "USDT", is_honeypot: "0", buy_tax: "0", sell_tax: "0", is_mintable: "1", is_proxy: "0", owner_address: "0xabc", is_blacklisted: "1", is_whitelisted: "0", holder_count: "100", lp_holder_count: "5" } },
      }),
    })) as unknown as typeof fetch;
    const out = await getGoplusRisk("ethereum", USDT);
    expect(out).toContain("Honeypot: 0");
    expect(out).toContain("Tether USD");
  });

  it("degrades honestly on unknown contract and HTTP errors", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ code: 1, result: {} }) })) as unknown as typeof fetch;
    expect(await getGoplusRisk("bsc", USDT)).toContain("no security data");
    global.fetch = vi.fn(async () => ({ ok: false, status: 429 })) as unknown as typeof fetch;
    expect(await getGoplusRisk("base", USDT)).toContain("GoPlus error");
    expect(await getGoplusRisk("solana", USDT)).toContain("unavailable for this chain");
  });
});
