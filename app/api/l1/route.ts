import { runL1 } from "@/lib/layered/l1";
import { isChainId, validateAddress } from "@/lib/chains";
import { logEvent } from "@/lib/layered/supabase";
import { emitResult, sseResponse } from "@/lib/layered/sse";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Best-effort demo throttle: 10 runs/hour/IP via Upstash Redis.
// Missing env or Redis error -> fail open (local dev has no Upstash).
async function upstashPipeline(cmds: unknown[][]): Promise<{ result: unknown }[]> {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    body: JSON.stringify(cmds),
  });
  return (await res.json()) as { result: unknown }[];
}

async function rateLimited(req: Request): Promise<boolean> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return false;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const hour = new Date().toISOString().slice(0, 13).replace(/[-T:]/g, "");
  const rlKey = `ratelimit-layered:${ip}:${hour}`;
  const rlRes = await upstashPipeline([["INCR", rlKey], ["EXPIRE", rlKey, 3600]]).catch(() => [{ result: 0 }]);
  return Number(rlRes[0]?.result ?? 0) > 10;
}

export async function POST(req: Request) {
  let chain: unknown;
  let mint: unknown;
  let wallet: unknown;
  try {
    const body = await req.json();
    chain = body.chain ?? "solana";
    mint = body.mint;
    wallet = body.wallet;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!isChainId(chain) || typeof mint !== "string" || !validateAddress(chain, mint)) {
    return Response.json({ error: "Invalid chain or address" }, { status: 400 });
  }
  if (await rateLimited(req)) {
    return Response.json({ error: "Demo limit: 10 runs per hour per IP" }, { status: 429 });
  }
  void logEvent("run_started", wallet);
  return sseResponse((emit) =>
    emitResult(emit, () => runL1(chain, mint, { signal: req.signal, emit: (e) => emit({ ...e }) }))
  );
}

