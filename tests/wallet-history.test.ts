import { describe, it, expect, vi } from "vitest";
import { listHistory } from "../lib/layered/supabase";

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
