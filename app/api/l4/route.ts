import { runL4 } from "@/lib/layered/l4";
import { sseResponse } from "@/lib/layered/sse";
import { MINT_REGEX } from "@/lib/pipeline/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SLOTS = ["onchain", "technical", "sentiment", "news"] as const;
const RISK_SLOTS = ["liquidity", "rugpath", "concentration"] as const;

export async function POST(req: Request) {
  let body: { mint?: unknown; token?: unknown; symbol?: unknown; reports?: unknown; debate?: unknown; risks?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { mint, token, symbol, reports, debate, risks } = body;
  if (typeof mint !== "string" || !MINT_REGEX.test(mint)) {
    return Response.json({ error: "Invalid Solana mint address" }, { status: 400 });
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
  return sseResponse(async (emit) => {
    try {
      const result = await runL4(
        {
          mint,
          token: token as { name: string; price: string; liquidity: number; change24h: number },
          symbol,
          reports: reports as Record<(typeof SLOTS)[number], string>,
          debate: debate as { phase: "invest"; round: number; side: "bull" | "bear"; text: string }[],
          risks: risks as Record<(typeof RISK_SLOTS)[number], string>,
        },
        { signal: req.signal }
      );
      emit({ type: "result", result });
    } catch (err) {
      emit({ type: "result", error: err instanceof Error ? err.message : String(err) });
    }
  });
}
