import type { AgentEvent } from "@/lib/pipeline/state";

export function channelName(runId: string): string {
  return `run:${runId}`;
}

function basicAuth(key: string): string {
  const bytes = new TextEncoder().encode(key);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return `Basic ${btoa(bin)}`;
}

async function publishMessage(runId: string, name: string, data: unknown): Promise<void> {
  const key = process.env.ABLY_API_KEY;
  if (!key) return; // no-op without env (local/manual runs keep working)
  try {
    const res = await fetch(
      `https://rest.ably.io/channels/${encodeURIComponent(channelName(runId))}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: basicAuth(key) },
        body: JSON.stringify({ messages: [{ name, data }] }),
      }
    );
    if (!res.ok) console.warn(`[ably] publish failed: status ${res.status}`);
  } catch (err) {
    console.warn(`[ably] publish failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function createAblyPublisher(runId: string) {
  return {
    publish(e: AgentEvent): Promise<void> {
      return publishMessage(runId, e.type, { ...e, ts: new Date().toISOString() });
    },
    flush(): Promise<void> {
      return Promise.resolve(); // every event publishes immediately
    },
    setStatus(status: "done" | "failed"): Promise<void> {
      return publishMessage(runId, "job_status", {
        status,
        finishedAt: new Date().toISOString(),
      });
    },
  };
}
