import type { ChainId } from "@/lib/chains";
import { CHAINS } from "@/lib/chains";

export async function getGoplusRisk(chain: ChainId, mint: string): Promise<string> {
  const id = CHAINS[chain].goplusId;
  if (!id) return "GoPlus unavailable for this chain";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`https://api.gopluslabs.io/api/v1/token_security/${id}?contract_addresses=${mint}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { code?: number; result?: Record<string, Record<string, string>> };
    const r = data.result?.[mint.toLowerCase()] ?? data.result?.[mint];
    if (!r) return "GoPlus: no security data for this contract";
    return [
      `Token: ${r.token_name ?? "?"} (${r.token_symbol ?? "?"}) — GoPlus security`,
      `Honeypot: ${r.is_honeypot ?? "?"} | Buy tax: ${r.buy_tax ?? "?"} | Sell tax: ${r.sell_tax ?? "?"}`,
      `Mintable: ${r.is_mintable ?? "?"} | Proxy: ${r.is_proxy ?? "?"} | Owner: ${r.owner_address ?? "none"}`,
      `Blacklisted: ${r.is_blacklisted ?? "?"} | Whitelisted: ${r.is_whitelisted ?? "?"}`,
      `Holders: ${r.holder_count ?? "?"} | LP holders: ${r.lp_holder_count ?? "?"}`,
    ].join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `GoPlus error: ${msg} (contract ${mint})`;
  } finally {
    clearTimeout(timer);
  }
}
