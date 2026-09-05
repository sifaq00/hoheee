import { listHistory } from "@/lib/layered/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") ?? "";
  return Response.json({ reports: await listHistory(wallet) });
}
