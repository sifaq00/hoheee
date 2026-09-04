import type { AgentEvent } from "@/lib/pipeline/state";

export const REASON_FLUSH_CHARS = 2000;
export function eventKey(runId: string): string { return `run:${runId}:events`; }
export function metaKey(runId: string): string { return `run:${runId}:meta`; }

async function pipeline(cmds: unknown[][]): Promise<void> {
  const base = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return; // Redis optional: no env = no-op (local/manual still work)
  const res = await fetch(`${base}/pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(cmds),
  });
  if (!res.ok) console.warn(`[progress] publish failed: status ${res.status}`);
}

export function createPublisher(runId: string) {
  const buffers = new Map<string, string>();
  async function send(cmds: unknown[][]): Promise<void> {
    try { await pipeline(cmds); } catch (err) {
      console.warn(`[progress] publish failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  async function flushAgent(agent: string): Promise<void> {
    const buf = buffers.get(agent) ?? "";
    buffers.delete(agent);
    if (!buf) return;
    await send([["RPUSH", eventKey(runId), JSON.stringify({ type: "reasoning", agent, text: buf, ts: new Date().toISOString() })]]);
  }
  return {
    async publish(e: AgentEvent): Promise<void> {
      if (e.type === "reasoning") {
        const buf = (buffers.get(e.agent) ?? "") + e.text;
        buffers.set(e.agent, buf);
        if (buf.length >= REASON_FLUSH_CHARS) await flushAgent(e.agent);
        return;
      }
      const agent = "agent" in e ? String((e as { agent: string }).agent) : null;
      if (agent) await flushAgent(agent);
      await send([
        ["RPUSH", eventKey(runId), JSON.stringify({ ...e, ts: new Date().toISOString() })],
        ["EXPIRE", eventKey(runId), 21600],
      ]);
    },
    async flush(): Promise<void> {
      for (const agent of [...buffers.keys()]) await flushAgent(agent);
    },
    async setStatus(status: "done" | "failed"): Promise<void> {
      await send([
        ["SET", metaKey(runId), JSON.stringify({ status, finishedAt: new Date().toISOString() })],
        ["EXPIRE", metaKey(runId), 21600],
      ]);
    },
  };
}
