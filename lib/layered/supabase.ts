export interface ReportRow {
  mint: string;
  model: string;
  token: { name: string; price: number; liquidity: number; change24h: number; symbol: string };
  reports: Record<string, string>;
  debate: { phase: string; round: number; side: string; text: string }[];
  risks: Record<string, string>;
  decision: string;
  rating: string | null;
  confidence: string | null;
  wallet?: string | null;
  views?: number;
}

export async function saveReport(
  row: ReportRow,
  deps: { url?: string; serviceKey?: string; fetchFn?: typeof fetch } = {}
): Promise<{ id: string }> {
  const url = deps.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = deps.serviceKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase server configuration");
  const fetchFn = deps.fetchFn ?? fetch;
  const res = await fetchFn(`${url}/rest/v1/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase save failed: ${res.status}`);
  const data = (await res.json()) as { id?: string }[];
  if (!data[0]?.id) throw new Error("Supabase save returned no id");
  return { id: data[0].id };
}

export async function loadReport(
  id: string,
  deps: { url?: string; anonKey?: string; fetchFn?: typeof fetch } = {}
): Promise<(ReportRow & { id: string }) | null> {
  const url = deps.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = deps.anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !/^[0-9a-f-]{1,64}$/i.test(id)) return null;
  const fetchFn = deps.fetchFn ?? fetch;
  const res = await fetchFn(`${url}/rest/v1/reports?id=eq.${encodeURIComponent(id)}&select=*`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown[];
  return (data[0] as (ReportRow & { id: string })) ?? null;
}

export interface HistoryItem {
  id: string;
  mint: string;
  symbol: string;
  rating: string | null;
  created_at: string;
}

export async function listHistory(
  wallet: string,
  deps: { url?: string; serviceKey?: string; fetchFn?: typeof fetch; limit?: number } = {}
): Promise<HistoryItem[]> {
  const url = deps.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = deps.serviceKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet) && !/^0x[0-9a-fA-F]{40}$/.test(wallet)) return [];
  const fetchFn = deps.fetchFn ?? fetch;
  const limit = Math.min(deps.limit ?? 20, 50);
  const res = await fetchFn(
    `${url}/rest/v1/reports?wallet=eq.${encodeURIComponent(wallet)}&select=id,mint,token,rating,created_at&order=created_at.desc&limit=${limit}`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { id: string; mint: string; token?: { symbol?: string }; rating?: string; created_at?: string }[];
  return data.map((r) => ({ id: r.id, mint: r.mint, symbol: r.token?.symbol ?? "?", rating: r.rating ?? "?", created_at: r.created_at ?? "" }));
}

export async function bumpViews(id: string): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey || !/^[0-9a-f-]{1,64}$/i.test(id)) return;
    const cur = await fetch(`${url}/rest/v1/reports?id=eq.${encodeURIComponent(id)}&select=views`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!cur.ok) return;
    const data = (await cur.json()) as { views?: number }[];
    const views = (data[0]?.views ?? 0) + 1;
    await fetch(`${url}/rest/v1/reports?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ views }),
    });
  } catch {
    // analytics best-effort: ignore
  }
}
