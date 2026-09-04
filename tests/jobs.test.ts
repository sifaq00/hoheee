import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../app/api/jobs/route";
import { GET } from "../app/api/jobs/[id]/events/route";

function req(body: unknown): Request {
  return new Request("http://x/api/jobs", { method: "POST", body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.stubEnv("GITHUB_TOKEN", "gh");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://demo.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
  global.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("api.github.com")) return { ok: true, status: 200, json: async () => ({ total_count: 0 }) } as unknown as Response;
    if (u.includes("/pipeline")) {
      const b = String((init as { body?: unknown })?.body ?? "");
      if (b.includes("INCR")) return { ok: true, status: 200, json: async () => ([{ result: 1 }, { result: 1 }]) } as unknown as Response;
      return { ok: true, status: 200, json: async () => ([{ result: "OK" }, { result: 1 }]) } as unknown as Response;
    }
    if (u.includes("incr")) return { ok: true, status: 200, json: async () => ({ result: 1 }) } as unknown as Response;
    return { ok: true, status: 200, json: async () => ({ result: "OK" }) } as unknown as Response;
  }) as unknown as typeof fetch;
});

describe("POST /api/jobs", () => {
  it("rejects invalid mint without touching GitHub", async () => {
    const res = await POST(req({ mint: "xxx" }));
    expect(res.status).toBe(400);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });
  it("dispatches and returns runId when idle", async () => {
    const res = await POST(req({ mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" }));
    expect(res.status).toBe(200);
    const body = await res.json() as { runId: string };
    expect(body.runId).toMatch(/^[0-9a-f-]{36}$/i);
    const posted = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(posted.some((u) => u.includes("/dispatches"))).toBe(true);
  });
  it("rate-limits via INCR + EXPIRE 7200 in one pipeline", async () => {
    const res = await POST(req({ mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" }));
    expect(res.status).toBe(200);
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const pipe = calls.filter((c) => String(c[0]).includes("/pipeline"));
    expect(pipe.length).toBeGreaterThan(0);
    const rlBody = JSON.parse(String(pipe[0][1]?.body ?? "null"));
    expect(rlBody[0][0]).toBe("INCR");
    expect(rlBody[1][0]).toBe("EXPIRE");
    expect(rlBody[1][2]).toBe(7200);
  });
  it("writes meta SET + EXPIRE 21600 in one pipeline", async () => {
    const res = await POST(req({ mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" }));
    expect(res.status).toBe(200);
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const bodies = calls.filter((c) => String(c[0]).includes("/pipeline")).map((c) => JSON.parse(String(c[1]?.body ?? "null")));
    expect(bodies.some((b) => b[0]?.[0] === "SET" && String(b[0][1]).includes(":meta") && b[1]?.[0] === "EXPIRE" && b[1][2] === 21600)).toBe(true);
  });
  it("returns 429 when a job is running", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: unknown) => {
      const u = String(url);
      if (u.includes("api.github.com") && u.includes("runs")) return { ok: true, status: 200, json: async () => ({ total_count: 1 }) } as unknown as Response;
      return { ok: true, status: 200, json: async () => ({ result: 1 }) } as unknown as Response;
    });
    const res = await POST(req({ mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" }));
    expect(res.status).toBe(429);
  });
});

describe("GET /api/jobs/[id]/events", () => {
  it("rejects malformed id", async () => {
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ id: ".." }) });
    expect(res.status).toBe(400);
  });
  it("return events + cursor + status", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: unknown) => {
      const u = String(url);
      if (u.includes("lrange")) return { ok: true, status: 200, json: async () => ({ result: [JSON.stringify({ type: "agent_start", agent: "onchain" })] }) } as unknown as Response;
      if (u.includes("get")) return { ok: true, status: 200, json: async () => ({ result: JSON.stringify({ status: "running" }) }) } as unknown as Response;
      return { ok: true, status: 200, json: async () => ({ result: null }) } as unknown as Response;
    });
    const res = await GET(new Request("http://x?cursor=0"), { params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }) });
    expect(res.status).toBe(200);
    const body = await res.json() as { events: unknown[]; cursor: number; total: number; status: string };
    expect(body.events.length).toBe(1);
    expect(body.cursor).toBe(1);
    expect(body.total).toBe(1);
    expect(body.status).toBe("running");
  });
  it("returns 502 when Upstash is down", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      return { ok: false, status: 500, json: async () => ({ result: null }) } as unknown as Response;
    });
    const res = await GET(new Request("http://x?cursor=0"), { params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }) });
    expect(res.status).toBe(502);
  });
});
