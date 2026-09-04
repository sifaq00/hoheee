import { isRunId } from "@/lib/progress/ids";
import { eventKey, metaKey } from "@/lib/progress/publisher";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isRunId(id)) return Response.json({ error: "Invalid run id" }, { status: 400 });
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Response.json({ error: "Server not configured (missing env)" }, { status: 500 });
  }
  const cursor = Math.max(0, Number(new URL(req.url).searchParams.get("cursor") ?? "0") || 0);
  const auth = { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` };
  const base = process.env.UPSTASH_REDIS_REST_URL;
  try {
    const [lr, mt] = await Promise.all([
      fetch(`${base}/lrange/${eventKey(id)}/${cursor}/-1`, { headers: auth, cache: "no-store" }),
      fetch(`${base}/get/${metaKey(id)}`, { headers: auth, cache: "no-store" }),
    ]);
    if (!lr.ok || !mt.ok) return Response.json({ error: "Cannot read progress" }, { status: 502 });
    const list = ((await lr.json()) as { result: string[] }).result ?? [];
    const metaRaw = ((await mt.json()) as { result: string | null }).result;
    const status = metaRaw ? (JSON.parse(metaRaw) as { status: string }).status : "running";
    const events = list.map((s) => JSON.parse(s) as unknown);
    return Response.json({ events, cursor: cursor + events.length, total: cursor + events.length, status });
  } catch { return Response.json({ error: "Cannot read progress" }, { status: 502 }); }
}
