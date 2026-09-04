import { MINT_REGEX } from "@/lib/pipeline/orchestrator";
import { newRunId } from "@/lib/progress/ids";

export const dynamic = "force-dynamic";
const OWNER_REPO = "sifaq00/hoheee";

async function upstashPipeline(cmds: unknown[][]): Promise<{ result: unknown }[]> {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    body: JSON.stringify(cmds),
  });
  return (await res.json()) as { result: unknown }[];
}
async function gh(path: string, init?: RequestInit): Promise<{ total_count?: number }> {
  const res = await fetch(`https://api.github.com/repos/${OWNER_REPO}${path}`, {
    ...init,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return (await res.json()) as { total_count?: number };
}

export async function POST(req: Request) {
  let mint: unknown;
  try { mint = (await req.json()).mint; } catch { return Response.json({ error: "Invalid request body" }, { status: 400 }); }
  if (typeof mint !== "string" || !MINT_REGEX.test(mint)) {
    return Response.json({ error: "Invalid Solana mint address" }, { status: 400 });
  }
  if (!process.env.GITHUB_TOKEN || !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Response.json({ error: "Server not configured (missing env)" }, { status: 500 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const day = new Date().toISOString().slice(0, 13).replace(/[-T:]/g, "");
  const rlKey = `ratelimit:${ip}:${day}`;
  const rlRes = await upstashPipeline([["INCR", rlKey], ["EXPIRE", rlKey, 7200]]).catch(() => [{ result: 0 }]);
  if (Number(rlRes[0]?.result ?? 0) > 3) return Response.json({ error: "Demo limit: 3 jobs per hour per IP" }, { status: 429 });
  try {
    const [q, p] = await Promise.all([
      gh(`/actions/workflows/generate.yml/runs?status=queued&per_page=1`),
      gh(`/actions/workflows/generate.yml/runs?status=in_progress&per_page=1`),
    ]);
    if ((q.total_count ?? 0) + (p.total_count ?? 0) > 0) {
      return Response.json({ error: "One job already running, try again later" }, { status: 429 });
    }
  } catch { return Response.json({ error: "Cannot check Actions status" }, { status: 502 }); }
  const runId = newRunId();
  const dispatched = await fetch(`https://api.github.com/repos/${OWNER_REPO}/actions/workflows/generate.yml/dispatches`, {
    method: "POST",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" },
    body: JSON.stringify({ ref: "main", inputs: { mint, run_id: runId } }),
  }).catch(() => null);
  if (!dispatched || !dispatched.ok) return Response.json({ error: "Failed to trigger Actions" }, { status: 502 });
  const metaVal = JSON.stringify({ status: "running", mint, startedAt: new Date().toISOString() });
  await upstashPipeline([["SET", `run:${runId}:meta`, metaVal], ["EXPIRE", `run:${runId}:meta`, 21600]]).catch(() => undefined);
  return Response.json({ runId });
}
