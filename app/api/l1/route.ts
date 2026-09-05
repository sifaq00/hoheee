import { runL1 } from "@/lib/layered/l1";
import { MINT_REGEX } from "@/lib/pipeline/orchestrator";

export const dynamic = "force-dynamic";
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
  try {
    return Response.json(await runL1(mint, { signal: req.signal }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.startsWith("Token not found") ? 404 : 502;
    return Response.json({ error: msg }, { status });
  }
}
