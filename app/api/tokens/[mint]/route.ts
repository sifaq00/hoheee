import { isChainId, validateAddress } from "@/lib/chains";
import { getTokenSummaryFor } from "@/lib/tools/dexscreener";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { mint } = await params;
  const chain = new URL(req.url).searchParams.get("chain") ?? "solana";
  if (!isChainId(chain) || !validateAddress(chain, mint ?? "")) {
    return Response.json({ error: "Invalid chain or address" }, { status: 400 });
  }
  try {
    const summary = await getTokenSummaryFor(chain, mint);
    if (!summary) {
      return Response.json({ error: "Token not found" }, { status: 404 });
    }
    return Response.json({ mint, chain, summary });
  } catch {
    return Response.json({ error: "Data source unreachable" }, { status: 502 });
  }
}
