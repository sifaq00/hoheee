import { describe, it, expect, vi, beforeEach } from "vitest";
import { invokeLLM, streamLLM } from "../lib/llm";

const CHOICES = { choices: [{ message: { content: "hi" }, finish_reason: "stop" }] };

function sseBody(payload: string) {
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new TextEncoder().encode(payload));
      c.close();
    },
  });
  return stream;
}

beforeEach(() => {
  vi.stubEnv("LLM_API_URL", "https://llm.test/v1/chat/completions");
  vi.stubEnv("LLM_API_KEY", "k");
  vi.stubEnv("LLM_MODEL", "m");
});

describe("llm compat", () => {
  it("works without AbortSignal.any (Node18) when signal+timeout given", async () => {
    const orig: unknown = (AbortSignal as unknown as Record<string, unknown>).any;
    // @ts-expect-error simulate Node18
    AbortSignal.any = undefined;
    try {
      global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => CHOICES })) as unknown as typeof fetch;
      const ctl = new AbortController();
      const res = await invokeLLM([{ role: "user", content: "x" }], { timeoutMs: 1000, signal: ctl.signal });
      expect(res.content).toBe("hi");
    } finally {
      (AbortSignal as unknown as Record<string, unknown>).any = orig;
    }
  });

  it("streamLLM does not crash on null body", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, body: null })) as unknown as typeof fetch;
    const res = await streamLLM([{ role: "user", content: "x" }], () => {});
    expect(res.content).toBe("");
  });

  it("streamLLM parses chunked tool_calls", async () => {
    const payload =
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"a","function":{"name":"get_","arguments":"{\\"m"}}}]}}]}\n' +
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"token_profile","arguments":"\\"int\\":1}"}}]}}]}\n' +
      "data: [DONE]\n";
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, body: sseBody(payload) })) as unknown as typeof fetch;
    const res = await streamLLM([{ role: "user", content: "x" }], () => {});
    expect(res.toolCalls.length).toBe(1);
  });
});
