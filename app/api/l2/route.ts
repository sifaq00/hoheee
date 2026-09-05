import { runL2 } from "@/lib/layered/l2";
import { isChainId, validateAddress } from "@/lib/chains";
import { verifyChain } from "@/lib/layered/chain";
import { emitResult, sseResponse } from "@/lib/layered/sse";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: { chainId?: unknown; mint?: unknown; reports?: unknown; rounds?: unknown; chain?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { chainId, mint, reports, rounds, chain: chainToken } = body;
  if (!isChainId(chainId) || typeof mint !== "string" || !validateAddress(chainId, mint)) {
    return Response.json({ error: "Invalid chain or address" }, { status: 400 });
  }
  const slots = ["onchain", "technical", "sentiment", "news"] as const;
  if (!reports || typeof reports !== "object" || !slots.every((s) => typeof (reports as Record<string, unknown>)[s] === "string")) {
    return Response.json({ error: "Invalid reports bundle" }, { status: 400 });
  }
  if (typeof chainToken !== "string" || !verifyChain(chainToken, "l1", chainId, mint, reports)) {
    return Response.json({ error: "Invalid layer chain" }, { status: 400 });
  }
  const r = typeof rounds === "number" && rounds >= 1 && rounds <= 3 ? Math.floor(rounds) : 2;
  return sseResponse((emit) =>
    emitResult(emit, () =>
      runL2(
        { chain: chainId, mint, reports: reports as Record<(typeof slots)[number], string>, rounds: r, chainToken },
        { signal: req.signal, emit: (turn) => emit({ type: "debate_turn", ...turn }) }
      )
    )
  );
}

