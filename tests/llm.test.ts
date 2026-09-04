import { describe, it, expect, vi, beforeEach } from "vitest";
import { invokeLLM } from "../lib/llm";

const CHOICES = { choices: [{ message: { content: "hi" }, finish_reason: "stop" }] };

beforeEach(() => {
  vi.stubEnv("LLM_API_URL", "https://llm.test/v1/chat/completions");
  vi.stubEnv("LLM_API_KEY", "k");
  vi.stubEnv("LLM_MODEL", "m");
});

describe("invokeLLM caps", () => {
  it("sends max_tokens through", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => CHOICES })) as unknown as typeof fetch;
    await invokeLLM([{ role: "user", content: "x" }], { maxTokens: 300 });
    const body = JSON.parse(String(((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as { body?: unknown })?.body ?? "null"));
    expect(body.max_tokens).toBe(300);
    expect(body.model).toBe("m");
  });

  it("omits max_tokens when unset", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => CHOICES })) as unknown as typeof fetch;
    await invokeLLM([{ role: "user", content: "x" }]);
    const body = JSON.parse(String(((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as { body?: unknown })?.body ?? "null"));
    expect("max_tokens" in body).toBe(false);
  });

  it("aborts a hanging call after timeoutMs", async () => {
    global.fetch = vi.fn(async (_u: unknown, init?: RequestInit) => {
      await new Promise((_res, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("aborted"))));
      return { ok: true, status: 200, json: async () => CHOICES };
    }) as unknown as typeof fetch;
    await expect(invokeLLM([{ role: "user", content: "x" }], { timeoutMs: 30 })).rejects.toThrow();
  });

  it("does not retry an aborted call (fetch called exactly once)", async () => {
    const abortErr = new DOMException("aborted", "AbortError");
    global.fetch = vi.fn(async () => {
      throw abortErr;
    }) as unknown as typeof fetch;
    await expect(invokeLLM([{ role: "user", content: "x" }], { timeoutMs: 30 })).rejects.toThrow();
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("retries once on non-abort errors", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => CHOICES }) as unknown as typeof fetch;
    await invokeLLM([{ role: "user", content: "x" }]);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });
});
