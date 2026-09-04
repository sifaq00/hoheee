import { MINT_REGEX } from "@/lib/pipeline/orchestrator";
import { runFlashAnalysis } from "@/lib/pipeline/flash";
import type { AgentEvent } from "@/lib/pipeline/state";

export const dynamic = "force-dynamic";
// Hobby cap; full runs are local/Actions-only.
export const maxDuration = 300;

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
        await runFlashAnalysis(mint, emit);
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
