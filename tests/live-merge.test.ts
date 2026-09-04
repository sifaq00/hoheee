import { describe, it, expect } from "vitest";
import { mergePage } from "../lib/client/live-merge";

describe("mergePage", () => {
  it("merges without duplicates and advances cursor", () => {
    const s0 = mergePage({ events: [], cursor: 0 }, { events: [{ a: 1 }], cursor: 1 });
    expect(s0).toEqual({ events: [{ a: 1 }], cursor: 1 });
    const s1 = mergePage(s0, { events: [{ a: 1 }], cursor: 1 });
    expect(s1.events.length).toBe(1);
  });
});
