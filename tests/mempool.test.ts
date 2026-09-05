import { describe, it, expect, vi } from "vitest";
import { getBtcOverview } from "../lib/tools/mempool";

describe("mempool", () => {
  it("summarizes chain stats honestly", async () => {
    global.fetch = vi.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes("hashrate")) return { ok: true, status: 200, json: async () => ({ currentHashrate: 800000000000000000000 }) } as unknown as Response;
      if (u.includes("difficulty")) return { ok: true, status: 200, json: async () => ({ progressPercent: 50, difficultyChange: 2.5, estimatedRetargetDate: 1 }) } as unknown as Response;
      if (u.includes("fees")) return { ok: true, status: 200, json: async () => ({ fastestFee: 10, halfHourFee: 8, hourFee: 5 }) } as unknown as Response;
      if (u.includes("height")) return { ok: true, status: 200, json: async () => 900000 } as unknown as Response;
      throw new Error("unexpected " + u);
    }) as unknown as typeof fetch;
    const out = await getBtcOverview();
    expect(out).toContain("800.00 EH/s");
    expect(out).toContain("900000");
  });

  it("degrades honestly on downtime", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch;
    const out = await getBtcOverview();
    expect(out).toContain("Hashrate (3d avg): n/a");
    expect(out).toContain("Tip height: n/a");
  });
});
