import { listHistory, walletStats } from "@/lib/layered/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") ?? "";
  const [reports, stats] = await Promise.all([listHistory(wallet), walletStats(wallet)]);
  return Response.json({ reports, stats });
}
