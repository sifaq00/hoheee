import { describe, it, expect, vi, beforeEach } from "vitest";
import { newRunId, isRunId } from "../lib/progress/ids";
import { createPublisher, eventKey, metaKey } from "../lib/progress/publisher";

beforeEach(() => {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://demo.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
  global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })) as unknown as typeof fetch;
});

describe("ids", () => {
  it("newRunId returns uuid format passing isRunId", () => {
    expect(isRunId(newRunId())).toBe(true);
  });
  it("rejects malformed strings", () => {
    expect(isRunId("../../etc")).toBe(false);
    expect(isRunId("")).toBe(false);
  });
});

describe("createPublisher", () => {
  it("sends agent_report via /pipeline and does not throw when Redis is down", async () => {
    const pub = createPublisher("r1");
    await pub.publish({ type: "agent_start", agent: "onchain" });
    await pub.publish({ type: "agent_report", agent: "onchain", report: "ok" });
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(String(calls[0][0])).toContain("/pipeline");
    const body = JSON.parse(String(calls[0][1]?.body ?? "null"));
    expect(Array.isArray(body)).toBe(true);
    expect(Array.isArray(body[0])).toBe(true);
    expect(body[0][0]).toBe("RPUSH");
    expect(body[1][0]).toBe("EXPIRE");
    expect(body[1][2]).toBe(21600);
    expect(eventKey("r1")).toBe("run:r1:events");
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("down"));
    await expect(pub.publish({ type: "agent_start", agent: "news" })).resolves.toBeUndefined();
  });
  it("flushes reasoning buffer every 2000 chars", async () => {
    const pub = createPublisher("r2");
    await pub.publish({ type: "reasoning", agent: "news", text: "x".repeat(2001) });
    const bodies = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[1]?.body ?? ""));
    expect(bodies.some((b) => b.includes("reasoning"))).toBe(true);
  });
  it("setStatus writes SET metaKey + EXPIRE 21600", async () => {
    const pub = createPublisher("r3");
    await pub.setStatus("done");
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const body = JSON.parse(String(calls[calls.length - 1][1]?.body ?? "null"));
    expect(body[0][0]).toBe("SET");
    expect(body[0][1]).toBe(metaKey("r3"));
    expect(body[1][0]).toBe("EXPIRE");
    expect(body[1][1]).toBe(metaKey("r3"));
    expect(body[1][2]).toBe(21600);
  });
});
