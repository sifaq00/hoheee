import { describe, it, expect } from "vitest";
import { initialLayeredState, layeredReducer } from "../lib/layered/reducer";

describe("layeredReducer", () => {
  it("advances l1 success into l2 running with reports kept", () => {
    const s0 = { ...initialLayeredState, step: "l1" as const, mint: "m" };
    const s1 = layeredReducer(s0, {
      type: "L1_OK",
      token: { name: "Bonk", price: "1", liquidity: 2, change24h: 3 },
      symbol: "BONK",
      reports: { onchain: "o", technical: "t", sentiment: "s", news: "n" },
    });
    expect(s1.step).toBe("l2");
    expect(s1.reports?.onchain).toBe("o");
  });

  it("keeps prior data on step error for retry", () => {
    const s0 = { ...initialLayeredState, step: "l2" as const, reports: { onchain: "o", technical: "t", sentiment: "s", news: "n" } };
    const s1 = layeredReducer(s0, { type: "FAIL", step: "l2", message: "boom" });
    expect(s1.step).toBe("error");
    expect(s1.failedStep).toBe("l2");
    expect(s1.reports?.onchain).toBe("o");
  });
});
