import { describe, it, expect } from "vitest";
import { sseResponse, type LayerEmit } from "../lib/layered/sse";

async function readAll(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

describe("sseResponse", () => {
  it("frames events plus done, honest error on throw", async () => {
    const emitFail = sseResponse(async (emit: LayerEmit) => {
      emit({ type: "token_found", name: "B", price: "1", liquidity: 2, change24h: 3 });
      throw new Error("boom");
    });
    expect(emitFail.headers.get("Content-Type")).toBe("text/event-stream");
    const text = await readAll(emitFail);
    expect(text).toContain('event: token_found\ndata: {"type":"token_found"');
    expect(text).toContain('event: error\ndata: {"type":"error"');
    expect(text).toContain('event: done\ndata: {"type":"done"');

    const emitOk = sseResponse(async (emit: LayerEmit) => {
      emit({ type: "result", result: { ok: true } });
    });
    const textOk = await readAll(emitOk);
    expect(textOk).toContain('event: result\ndata: {"type":"result"');
  });
});
