import type { AgentEvent } from "@/lib/pipeline/state";

export type SSEHandler = (type: string, data: unknown) => void;

// Fetch POST + parse `event: <type>\ndata: <json>` SSE frames.
// EventSource cannot POST, so this reader loop mirrors the server emit format.
export async function streamSSE(
  url: string,
  body: unknown,
  onEvent: SSEHandler,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    throw new Error(`SSE request failed: ${res.status} ${res.statusText}`);
  }
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let eventType = "";

  const dispatch = (raw: string) => {
    if (!raw) return;
    try {
      onEvent(eventType || "message", JSON.parse(raw) as AgentEvent);
    } catch {
      // Skip malformed data frames.
    }
    eventType = "";
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";
    for (const frame of frames) {
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) eventType = line.slice(6).trim();
        else if (line.startsWith("data:")) data += (data ? "\n" : "") + line.slice(5).trim();
      }
      dispatch(data);
    }
    if (signal?.aborted) break;
  }
  const tail = buf.trim();
  if (tail.startsWith("data:")) dispatch(tail.slice(5).trim());
}
