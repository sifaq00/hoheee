import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../app/api/jobs/route";
import { GET } from "../app/api/jobs/[id]/token/route";

function req(body: unknown): Request {
  return new Request("http://x/api/jobs", { method: "POST", body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.stubEnv("GITHUB_TOKEN", "gh");
  vi.stubEnv("ABLY_API_KEY", "appId.keyId:keySecret");
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

describe("GET /api/jobs/[id]/token", () => {
  it("rejects malformed id", async () => {
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ id: ".." }) });
    expect(res.status).toBe(400);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });
  it("returns a channel-scoped token request", async () => {
    const id = "11111111-1111-1111-1111-111111111111";
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: unknown, init?: RequestInit) => {
      expect(String(url)).toBe("https://rest.ably.io/keys/appId.keyId/requestToken");
      const body = JSON.parse(String((init as { body?: unknown })?.body ?? "null"));
      expect(body.capability).toEqual({ [`run:${id}`]: ["subscribe", "history"] });
      return { ok: true, status: 200, json: async () => ({ token: "tok123", keyName: "appId.keyId" }) } as unknown as Response;
    });
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ id }) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };
    expect(body.token).toBe("tok123");
  });
  it("returns 500 without key and 502 when Ably is down", async () => {
    vi.stubEnv("ABLY_API_KEY", "");
    const id = "11111111-1111-1111-1111-111111111111";
    const r1 = await GET(new Request("http://x"), { params: Promise.resolve({ id }) });
    expect(r1.status).toBe(500);
    vi.stubEnv("ABLY_API_KEY", "appId.keyId:keySecret");
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      return { ok: false, status: 500, json: async () => ({}) } as unknown as Response;
    });
    const r2 = await GET(new Request("http://x"), { params: Promise.resolve({ id }) });
    expect(r2.status).toBe(502);
  });
});
