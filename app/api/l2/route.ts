import { runL2 } from "@/lib/layered/l2";
import { sseResponse } from "@/lib/layered/sse";
import { MINT_REGEX } from "@/lib/pipeline/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: { mint?: unknown; reports?: unknown; rounds?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { mint, reports, rounds } = body;
  if (typeof mint !== "string" || !MINT_REGEX.test(mint)) {
    return Response.json({ error: "Invalid Solana mint address" }, { status: 400 });
  }
  const slots = ["onchain", "technical", "sentiment", "news"] as const;
  if (!reports || typeof reports !== "object" || !slots.every((s) => typeof (reports as Record<string, unknown>)[s] === "string")) {
    return Response.json({ error: "Invalid reports bundle" }, { status: 400 });
  }
  const r = typeof rounds === "number" && rounds >= 1 && rounds <= 3 ? Math.floor(rounds) : 2;
  return sseResponse(async (emit) => {
    try {
      const result = await runL2(
        { mint, reports: reports as Record<(typeof slots)[number], string>, rounds: r },
        { signal: req.signal, emit: (turn) => emit({ type: "debate_turn", ...turn }) }
      );
      emit({ type: "result", result });
    } catch (err) {
      emit({ type: "result", error: err instanceof Error ? err.message : String(err) });
    }
  });
}
