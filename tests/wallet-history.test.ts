import { describe, it, expect, vi } from "vitest";
import { listHistory, logEvent, walletStats } from "../lib/layered/supabase";

const WALLET = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

describe("listHistory", () => {
  it("maps rows to history items", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [{ id: "a", mint: "m", token: { symbol: "BONK" }, rating: "Hold", created_at: "2026-09-05" }],
    })) as unknown as typeof fetch;
    const items = await listHistory(WALLET, { url: "https://db.test", serviceKey: "srv", fetchFn });
    expect(items).toEqual([{ id: "a", mint: "m", symbol: "BONK", rating: "Hold", created_at: "2026-09-05" }]);
  });

  it("short-circuits invalid wallet without fetch", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    await expect(listHistory("xxx", { url: "https://db.test", serviceKey: "srv", fetchFn })).resolves.toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns [] on REST error", async () => {
    const fetchFn = vi.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch;
    await expect(listHistory(WALLET, { url: "https://db.test", serviceKey: "srv", fetchFn })).resolves.toEqual([]);
  });
});

describe("logEvent", () => {
  it("posts started events, skips invalid wallets silently", async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, status: 201, json: async () => ({}) })) as unknown as typeof fetch;
    await logEvent("run_started", WALLET, undefined, { url: "https://db.test", serviceKey: "srv", fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [, init] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, { body?: string }];
    expect(JSON.parse(init.body ?? "{}")).toMatchObject({ wallet: WALLET, type: "run_started" });
    await logEvent("run_completed", "xxx", undefined, { url: "https://db.test", serviceKey: "srv", fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe("walletStats", () => {
  it("counts completions plus latest date", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [{ created_at: "2026-09-05T10:00:00Z" }, { created_at: "2026-09-04T10:00:00Z" }],
    })) as unknown as typeof fetch;
    await expect(walletStats(WALLET, { url: "https://db.test", serviceKey: "srv", fetchFn })).resolves.toEqual({
      runs: 2,
      lastRun: "2026-09-05T10:00:00Z",
    });
  });

  it("falls back to zeros without config", async () => {
    await expect(walletStats(WALLET, { url: undefined, serviceKey: undefined })).resolves.toEqual({ runs: 0, lastRun: null });
  });
});
