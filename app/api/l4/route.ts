import { runL4 } from "@/lib/layered/l4";
import { isChainId, validateAddress } from "@/lib/chains";
import { verifyChain } from "@/lib/layered/chain";
import { emitResult, sseResponse } from "@/lib/layered/sse";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SLOTS = ["onchain", "technical", "sentiment", "news"] as const;
const RISK_SLOTS = ["liquidity", "rugpath", "concentration"] as const;

export async function POST(req: Request) {
  let body: { chainId?: unknown; mint?: unknown; token?: unknown; symbol?: unknown; reports?: unknown; debate?: unknown; risks?: unknown; wallet?: unknown; chain?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { chainId, mint, token, symbol, reports, debate, risks, wallet, chain: chainToken } = body;
  if (!isChainId(chainId) || typeof mint !== "string" || !validateAddress(chainId, mint)) {
    return Response.json({ error: "Invalid chain or address" }, { status: 400 });
  }
  if (!token || typeof token !== "object" || typeof symbol !== "string") {
    return Response.json({ error: "Invalid token" }, { status: 400 });
  }
  if (!reports || typeof reports !== "object" || !SLOTS.every((s) => typeof (reports as Record<string, unknown>)[s] === "string")) {
    return Response.json({ error: "Invalid reports bundle" }, { status: 400 });
  }
  if (!Array.isArray(debate)) {
    return Response.json({ error: "Invalid debate" }, { status: 400 });
  }
  if (!risks || typeof risks !== "object" || !RISK_SLOTS.every((s) => typeof (risks as Record<string, unknown>)[s] === "string")) {
    return Response.json({ error: "Invalid risks" }, { status: 400 });
  }
  if (typeof chainToken !== "string" || !verifyChain(chainToken, "l3", chainId, mint, risks)) {
    return Response.json({ error: "Invalid layer chain" }, { status: 400 });
  }
  return sseResponse((emit) =>
    emitResult(emit, () =>
      runL4(
        {
          chain: chainId,
          mint,
          wallet: typeof wallet === "string" ? wallet : undefined,
          token: token as { name: string; price: string; liquidity: number; change24h: number },
          symbol,
          reports: reports as Record<(typeof SLOTS)[number], string>,
          debate: debate as { phase: "invest"; round: number; side: "bull" | "bear"; text: string }[],
          risks: risks as Record<(typeof RISK_SLOTS)[number], string>,
          chainToken,
        },
        { signal: req.signal }
      )
    )
  );
}

