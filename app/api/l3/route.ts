import { runL3 } from "@/lib/layered/l3";
import { MINT_REGEX } from "@/lib/pipeline/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: { mint?: unknown; reports?: unknown; debate?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { mint, reports, debate } = body;
  if (typeof mint !== "string" || !MINT_REGEX.test(mint)) {
    return Response.json({ error: "Invalid Solana mint address" }, { status: 400 });
  }
  const slots = ["onchain", "technical", "sentiment", "news"] as const;
  if (!reports || typeof reports !== "object" || !slots.every((s) => typeof (reports as Record<string, unknown>)[s] === "string")) {
    return Response.json({ error: "Invalid reports bundle" }, { status: 400 });
  }
  if (!Array.isArray(debate) || !debate.every((d) => d && typeof (d as { text?: unknown }).text === "string")) {
    return Response.json({ error: "Invalid debate" }, { status: 400 });
  }
  try {
    return Response.json(
      await runL3(
        { mint, reports: reports as Record<(typeof slots)[number], string>, debate: debate as { phase: "invest"; round: number; side: "bull" | "bear"; text: string }[] },
        { signal: req.signal }
      )
    );
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
