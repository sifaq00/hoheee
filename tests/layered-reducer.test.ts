import { describe, it, expect } from "vitest";
import { initialLayeredState, layeredReducer, type LayeredState } from "../lib/layered/reducer";

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

  it("appends live turns and keeps them on L2_OK without doubles", () => {
    let s: LayeredState = { ...initialLayeredState, step: "l2" };
    s = layeredReducer(s, { type: "L2_TURN", turn: { phase: "invest", round: 1, side: "bull", text: "up" } });
    s = layeredReducer(s, { type: "L2_OK", debate: [{ phase: "invest", round: 1, side: "bull", text: "up" }] });
    expect(s.step).toBe("l3");
    expect(s.debate).toHaveLength(1);
  });

  it("clears stale debate turns when retrying L2", () => {
    let s: LayeredState = { ...initialLayeredState, step: "error", failedStep: "l2", debate: [{ phase: "invest" as const, round: 1, side: "bull" as const, text: "stale" }] };
    s = layeredReducer(s, { type: "RETRY" });
    expect(s.step).toBe("l2");
    expect(s.debate).toHaveLength(0);
  });

  it("stores progress notes and clears them on step advance", () => {
    let s: LayeredState = { ...initialLayeredState, step: "l1" };
    s = layeredReducer(s, { type: "NOTE", note: "L1 analysts 1/4" });
    expect(s.note).toBe("L1 analysts 1/4");
    s = layeredReducer(s, { type: "L1_OK", token: { name: "B", price: "1", liquidity: 2, change24h: 3 }, symbol: "B", reports: { onchain: "o", technical: "t", sentiment: "s", news: "n" } });
    expect(s.note).toBeNull();
  });
});
