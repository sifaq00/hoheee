import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTokenProfile, getTokenSummary, getTopPools } from "../lib/tools/dexscreener";
import { getRiskReport, getHolderDistribution } from "../lib/tools/rugcheck";
import { getCoinMetadata, getPriceHistory } from "../lib/tools/coingecko";
import { TOOL_SPECS, TOOL_EXECUTORS } from "../lib/tools";
import dexFixture from "./fixtures/dexscreener-bonk.json";
import rugFixture from "./fixtures/rugcheck-bonk.json";

beforeEach(() => {
  global.fetch = vi.fn(async (url: unknown) => ({
    ok: true,
    status: 200,
    json: async () => (String(url).includes("rugcheck") ? rugFixture : dexFixture),
  })) as unknown as typeof fetch;
});

describe("getTokenProfile", () => {
  it("summarizes the largest liquidity pair from DexScreener", async () => {
    const out = await getTokenProfile("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
    expect(out).toContain("Bonk");
    expect(out).toContain("liquidity");
  });

  it("reports token not found when pairs is null", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ pairs: null }),
    }));
    const out = await getTokenProfile("11111111111111111111111111111111111111111");
    expect(out).toContain("not found");
  });
});

describe("getTopPools", () => {
  it("lists top pools with liquidity", async () => {
    const out = await getTopPools("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
    expect(out.toLowerCase()).toContain("liquidity");
  });
});

describe("getTokenSummary", () => {
  it("returns correct fields from BONK fixture", async () => {
    const summary = await getTokenSummary("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
    expect(summary).not.toBeNull();
    expect(summary?.name).toBe("Bonk");
    expect(summary?.symbol).toBe("Bonk");
    expect(summary?.priceUsd).toBe("0.000003123");
    expect(summary?.liquidityUsd).toBe(214304.37);
    expect(summary?.priceChange24h).toBe(6.83);
    expect(summary?.marketCap).toBe(274865565);
    expect(typeof summary?.ageDays).toBe("number");
  });

  it("returns null when pairs null", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ pairs: null }),
    }));
    const summary = await getTokenSummary("11111111111111111111111111111111111111111");
    expect(summary).toBeNull();
  });
});

describe("getRiskReport", () => {
  it("mentions authority status and score", async () => {
    const out = await getRiskReport("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
    expect(out).toContain("mint authority");
  });

  it("reports 404 as not available", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    }));
    const out = await getRiskReport("11111111111111111111111111111111111111111");
    expect(out).toContain("not available");
  });
});

describe("getHolderDistribution", () => {
  it("lists top holders with pct", async () => {
    const out = await getHolderDistribution("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
    expect(out.toLowerCase()).toContain("holders");
  });
});

describe("getCoinMetadata", () => {
  it("resolves contract then fetches coin metadata", async () => {
    const calls: string[] = [];
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      calls.push(String(url));
      if (String(url).includes("/contract/")) {
        return { ok: true, status: 200, json: async () => ({ id: "bonk", symbol: "bonk" }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: "bonk",
          categories: ["Memes"],
          description: { en: "Bonk is a dog-themed token on Solana." },
          watchlist_portfolio_users: 100000,
          sentiment_votes_up_percentage: 70,
          community_data: null,
          market_data: {
            current_price: { usd: 0.0000031 },
            ath: { usd: 0.0000045 },
            ath_change_percentage: { usd: -30 },
            total_volume: { usd: 50000000 },
          },
        }),
      };
    });
    const out = await getCoinMetadata("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
    expect(calls[0]).toContain("/coins/solana/contract/");
    expect(out).toContain("Memes");
    expect(out).toContain("not available");
  });

  it("reports unlisted coin on resolve 404", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    }));
    const out = await getCoinMetadata("11111111111111111111111111111111111111111");
    expect(out).toContain("not listed");
  });
});

describe("getPriceHistory", () => {
  it("formats 30d daily prices", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (String(url).includes("/contract/")) {
        return { ok: true, status: 200, json: async () => ({ id: "bonk" }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          prices: [
            [1754000000000, 0.000003],
            [1754086400000, 0.0000032],
          ],
        }),
      };
    });
    const out = await getPriceHistory("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
    expect(out).toContain("2025-");
  });
});

describe("registry", () => {
  it("exposes 7 specs and 6 base executors", () => {
    expect(Object.keys(TOOL_SPECS).length).toBe(7);
    expect(Object.keys(TOOL_EXECUTORS).length).toBe(6);
  });

  it("executor parses args json and returns summary", async () => {
    const out = await TOOL_EXECUTORS.get_token_profile(
      JSON.stringify({ mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" })
    );
    expect(out).toContain("Bonk");
  });

  it("executor returns invalid arguments on bad json", async () => {
    const out = await TOOL_EXECUTORS.get_top_pools("{not json");
    expect(out).toContain("invalid arguments");
  });
});

describe("error handling", () => {
  it("fetchers never throw - return error strings", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const results = await Promise.all([
      getTokenProfile("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"),
      getTopPools("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"),
      getRiskReport("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"),
      getHolderDistribution("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"),
      getCoinMetadata("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"),
      getPriceHistory("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"),
    ]);
    for (const r of results) expect(r).toMatch(/error/i);
  });
});
