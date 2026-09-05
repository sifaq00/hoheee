import { MINT_REGEX } from "@/lib/layered/validate";
import { getTokenSummary } from "@/lib/tools/dexscreener";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { mint } = await params;
  if (!MINT_REGEX.test(mint ?? "")) {
    return Response.json({ error: "Invalid Solana mint address" }, { status: 400 });
  }
  try {
    const summary = await getTokenSummary(mint);
    if (!summary) {
      return Response.json({ error: "Token not found" }, { status: 404 });
    }
    return Response.json({ mint, summary });
  } catch {
    return Response.json({ error: "Data source unreachable" }, { status: 502 });
  }
}
