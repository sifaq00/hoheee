export type LayerEmit = (event: Record<string, unknown> & { type: string }) => void;

// SSE response for one layer: streams progress events, ends with done.
// Errors go inline as {type:"error"} (status is already 200 once streaming).
export function sseResponse(run: (emit: LayerEmit) => Promise<void>): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const emit: LayerEmit = (event) => {
        controller.enqueue(enc.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
      };
      try {
        await run(emit);
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : String(err) });
      }
      emit({ type: "done" });
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}

// Shared tail for layer routes: full result or honest inline error.
export async function emitResult(emit: LayerEmit, fn: () => Promise<unknown>): Promise<void> {
  try {
    emit({ type: "result", result: await fn() });
  } catch (err) {
    emit({ type: "result", error: err instanceof Error ? err.message : String(err) });
  }
}
