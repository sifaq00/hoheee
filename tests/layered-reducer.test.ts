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

  it("walks L1..L4 to done preserving all data", () => {
    let s = layeredReducer(initialLayeredState, { type: "START", mint: "m" });
    s = layeredReducer(s, { type: "L1_OK", token: { name: "B", price: "1", liquidity: 2, change24h: 3 }, symbol: "B", reports: { onchain: "o", technical: "t", sentiment: "s", news: "n" } });
    s = layeredReducer(s, { type: "L2_OK", debate: [{ phase: "invest", round: 1, side: "bull", text: "up" }] });
    s = layeredReducer(s, { type: "L3_OK", risks: { liquidity: "l", rugpath: "r", concentration: "c" } });
    s = layeredReducer(s, { type: "L4_OK", decision: "RATING: Hold", shareId: "id-1" });
    expect(s.step).toBe("done");
    expect(s.shareId).toBe("id-1");
    expect(s.debate).toHaveLength(1);
  });
});
