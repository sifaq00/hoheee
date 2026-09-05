import { runL3 } from "@/lib/layered/l3";
import { isChainId, validateAddress } from "@/lib/chains";
import { verifyChain } from "@/lib/layered/chain";
import { emitResult, sseResponse } from "@/lib/layered/sse";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: { chainId?: unknown; mint?: unknown; reports?: unknown; debate?: unknown; chain?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { chainId, mint, reports, debate, chain: chainToken } = body;
  if (!isChainId(chainId) || typeof mint !== "string" || !validateAddress(chainId, mint)) {
    return Response.json({ error: "Invalid chain or address" }, { status: 400 });
  }
  const slots = ["onchain", "technical", "sentiment", "news"] as const;
  if (!reports || typeof reports !== "object" || !slots.every((s) => typeof (reports as Record<string, unknown>)[s] === "string")) {
    return Response.json({ error: "Invalid reports bundle" }, { status: 400 });
  }
  if (!Array.isArray(debate) || !debate.every((d) => d && typeof (d as { text?: unknown }).text === "string")) {
    return Response.json({ error: "Invalid debate" }, { status: 400 });
  }
  if (typeof chainToken !== "string" || !verifyChain(chainToken, "l2", chainId, mint, debate)) {
    return Response.json({ error: "Invalid layer chain" }, { status: 400 });
  }
  return sseResponse((emit) =>
    emitResult(emit, () =>
      runL3(
        { chain: chainId, mint, reports: reports as Record<(typeof slots)[number], string>, debate: debate as { phase: "invest"; round: number; side: "bull" | "bear"; text: string }[], chainToken },
        { signal: req.signal, emit: (agent, report) => emit({ type: "agent_report", agent, report }) }
      )
    )
  );
}

