import { describe, it, expect } from "vitest";
import { mintChain, verifyChain } from "../lib/layered/chain";

describe("layer chain", () => {
  it("roundtrips valid payloads", () => {
    const c = mintChain("l1", "MINT", { a: 1 });
    expect(verifyChain(c, "l1", "MINT", { a: 1 })).toBe(true);
  });

  it("rejects tampered payload, wrong layer, wrong mint", () => {
    const c = mintChain("l1", "MINT", { a: 1 });
    expect(verifyChain(c, "l1", "MINT", { a: 2 })).toBe(false);
    expect(verifyChain(c, "l2", "MINT", { a: 1 })).toBe(false);
    expect(verifyChain(c, "l1", "OTHER", { a: 1 })).toBe(false);
    expect(verifyChain("garbage", "l1", "MINT", { a: 1 })).toBe(false);
  });

  it("rejects foreign secret", () => {
    const c = mintChain("l1", "MINT", { a: 1 }, "secret-a");
    expect(verifyChain(c, "l1", "MINT", { a: 1 }, "secret-b")).toBe(false);
    expect(verifyChain(c, "l1", "MINT", { a: 1 }, "secret-a")).toBe(true);
  });
});
