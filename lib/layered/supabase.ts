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
