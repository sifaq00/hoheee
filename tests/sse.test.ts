import { describe, it, expect, vi } from "vitest";
import { streamSSE } from "../lib/client/sse";

function mockFetchWithChunks(chunks: string[]) {
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
      controller.close();
    },
  });
  global.fetch = vi.fn(async () => ({ ok: true, status: 200, statusText: "OK", body: stream })) as unknown as typeof fetch;
}

describe("streamSSE tail", () => {
  it("dispatches final frame without trailing blank line", async () => {
    mockFetchWithChunks(['event: decision\ndata: {"type":"decision","markdown":"hi"}']);
    const seen: unknown[] = [];
    await streamSSE("http://x/api", {}, (_t, d) => seen.push(d));
    expect(seen.length).toBe(1);
  });
});
