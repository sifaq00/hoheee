import { isRunId } from "@/lib/progress/ids";
import { channelName } from "@/lib/progress/ably";

export const dynamic = "force-dynamic";

// Mints a short-lived Ably token request scoped to one run channel.
// The full ABLY_API_KEY never leaves the server; the browser only gets
// subscribe+history capability for its own run.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isRunId(id)) return Response.json({ error: "Invalid run id" }, { status: 400 });
  const key = process.env.ABLY_API_KEY;
  if (!key) return Response.json({ error: "Server is not configured (missing env)" }, { status: 500 });
  const keyName = key.split(":")[0];
  try {
    const res = await fetch(
      `https://rest.ably.io/keys/${encodeURIComponent(keyName)}/requestToken`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(key).toString("base64")}`,
        },
        body: JSON.stringify({
          capability: { [channelName(id)]: ["subscribe", "history"] },
          ttl: 3600000,
        }),
      }
    );
    if (!res.ok) return Response.json({ error: "Could not mint channel token" }, { status: 502 });
    return Response.json(await res.json());
  } catch {
    return Response.json({ error: "Could not mint channel token" }, { status: 502 });
  }
}
