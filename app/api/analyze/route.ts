import { MINT_REGEX, runAnalysis } from "@/lib/pipeline/orchestrator";
import type { AgentEvent } from "@/lib/pipeline/state";

export const dynamic = "force-dynamic";
// Hobby cap; full runs are local/Actions-only.
export const maxDuration = 300;

// Best-effort demo throttle: 10 flash runs/hour/IP via Upstash Redis.
// Missing env or Redis error -> fail open (local dev has no Upstash).
async function upstashPipeline(cmds: unknown[][]): Promise<{ result: unknown }[]> {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    body: JSON.stringify(cmds),
  });
  return (await res.json()) as { result: unknown }[];
}

async function rateLimited(req: Request): Promise<boolean> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return false;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const hour = new Date().toISOString().slice(0, 13).replace(/[-T:]/g, "");
  const rlKey = `ratelimit-flash:${ip}:${hour}`;
  const rlRes = await upstashPipeline([["INCR", rlKey], ["EXPIRE", rlKey, 3600]]).catch(() => [{ result: 0 }]);
  return Number(rlRes[0]?.result ?? 0) > 10;
}

export async function POST(req: Request) {
  let mint: unknown;
  try {
    mint = (await req.json()).mint;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (typeof mint !== "string" || !MINT_REGEX.test(mint)) {
    return Response.json({ error: "Invalid Solana mint address" }, { status: 400 });
  }
  if (await rateLimited(req)) {
    return Response.json({ error: "Demo limit: 10 runs per hour per IP" }, { status: 429 });
  }
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AgentEvent) => {
        try {
          controller.enqueue(enc.encode(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`));
        } catch {
          // controller closed (client disconnected) — further events dropped
        }
      };
      try {
        await runAnalysis(mint, emit, { signal: req.signal });
      } catch (err) {
        emit({
          type: "error",
          agent: "orchestrator",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        try {
          emit({ type: "done", runId: crypto.randomUUID() });
        } finally {
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
