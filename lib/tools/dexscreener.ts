import type { ChainId } from "@/lib/chains";
import { CHAINS } from "@/lib/chains";
import type { TokenSummary } from "@/lib/pipeline/state";
import { fmtNum as num } from "../format";

export interface DexPair {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  txns?: Record<string, { buys?: number; sells?: number }>;
  volume?: Record<string, number>;
  priceChange?: Record<string, number>;
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
}

const API = "https://api.dexscreener.com/latest/dex/tokens";

function chainApi(chain: ChainId, mint: string): string {
  if (chain === "solana") return `${API}/${mint}`;
  return `https://api.dexscreener.com/tokens/v1/${CHAINS[chain].dexChainId}/${mint}`;
}

async function fetchPairs(mint: string): Promise<DexPair[] | null> {
  return fetchPairsFor("solana", mint);
}

async function fetchPairsFor(chain: ChainId, mint: string): Promise<DexPair[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(chainApi(chain, mint), { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const raw = (Array.isArray(data) ? data : (data as { pairs?: DexPair[] | null }).pairs) as DexPair[] | undefined;
    const pairs = raw as DexPair[] | null | undefined;
    return pairs && pairs.length > 0 ? pairs : null;
  } finally {
    clearTimeout(timer);
  }
}

/** Summarize the largest-liquidity pair as structured data. Null = not found; throws on network/HTTP error. */
export async function getTokenSummary(mint: string): Promise<TokenSummary | null> {
  const pairs = await fetchPairs(mint);
  if (!pairs) return null;
  const top = [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  const summary: TokenSummary = {
    name: top.baseToken?.name ?? "Unknown",
    symbol: top.baseToken?.symbol ?? "?",
    priceUsd: top.priceUsd ?? "n/a",
    liquidityUsd: top.liquidity?.usd ?? 0,
    priceChange24h: top.priceChange?.h24 ?? 0,
  };
  const mc = top.marketCap ?? top.fdv;
  if (mc !== undefined) summary.marketCap = mc;
  if (top.pairCreatedAt) summary.ageDays = Math.floor((Date.now() - top.pairCreatedAt) / 86_400_000);
  return summary;
}

/** Chain-aware summary. Same shape on every network. */
export async function getTokenSummaryFor(chain: ChainId, mint: string): Promise<TokenSummary | null> {
  const pairs = await fetchPairsFor(chain, mint);
  if (!pairs) return null;
  const top = [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  const summary: TokenSummary = {
    name: top.baseToken?.name ?? "Unknown",
    symbol: top.baseToken?.symbol ?? "?",
    priceUsd: top.priceUsd ?? "n/a",
    liquidityUsd: top.liquidity?.usd ?? 0,
    priceChange24h: top.priceChange?.h24 ?? 0,
  };
  const mc = top.marketCap ?? top.fdv;
  if (mc !== undefined) summary.marketCap = mc;
  if (top.pairCreatedAt) summary.ageDays = Math.floor((Date.now() - top.pairCreatedAt) / 86_400_000);
  return summary;
}

function withError(name: string, mint: string, fn: () => Promise<string>): Promise<string> {
  return fn().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    return `${name} error: ${msg} (mint ${mint})`;
  });
}

function ageDays(ms?: number): string {
  if (!ms) return "n/a";
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days < 0) return "0 days";
  if (days < 365) return `${days} days`;
  return `${(days / 365).toFixed(1)} years (${days} days)`;
}

/** Summarize the largest-liquidity pair for a Solana token mint. */
export async function getTokenProfile(mint: string): Promise<string> {
  return getTokenProfileFor("solana", mint);
}

/** Chain-aware token profile. */
export async function getTokenProfileFor(chain: ChainId, mint: string): Promise<string> {
  return withError("DexScreener", mint, async () => {
    const pairs = await fetchPairsFor(chain, mint);
    if (!pairs) return "Token not found on DexScreener (no pairs)";
    const top = [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    const t = top.txns?.h24 ?? {};
    const pc = top.priceChange ?? {};
    return [
      `Token: ${top.baseToken?.name ?? "?"} (${top.baseToken?.symbol ?? "?"}) — top pool by liquidity`,
      `DEX: ${top.dexId ?? "?"} | price: $${top.priceUsd ?? "n/a"}`,
      `Liquidity: $${num(top.liquidity?.usd)}`,
      `24h volume: $${num(top.volume?.h24)}`,
      `24h txns: ${t.buys ?? 0} buys / ${t.sells ?? 0} sells`,
      `Price change: 5m ${pc.m5 ?? "n/a"}% | 1h ${pc.h1 ?? "n/a"}% | 6h ${pc.h6 ?? "n/a"}% | 24h ${pc.h24 ?? "n/a"}%`,
      `Market cap: $${num(top.marketCap)} | FDV: $${num(top.fdv)}`,
      `Pool age: ${ageDays(top.pairCreatedAt)}`,
    ].join("\n");
  });
}

/** List the top 5 pools by liquidity for a Solana token mint. */
export async function getTopPools(mint: string): Promise<string> {
  return getTopPoolsFor("solana", mint);
}

/** Chain-aware top pools. */
export async function getTopPoolsFor(chain: ChainId, mint: string): Promise<string> {
  return withError("DexScreener", mint, async () => {
    const pairs = await fetchPairsFor(chain, mint);
    if (!pairs) return "Token not found on DexScreener (no pairs)";
    const top5 = [...pairs]
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))
      .slice(0, 5);
    const lines = top5.map(
      (p, i) =>
        `${i + 1}. ${p.dexId ?? "?"} ${p.pairAddress ?? "?"} — liquidity $${num(p.liquidity?.usd)}, 24h volume $${num(p.volume?.h24)}, price $${p.priceUsd ?? "n/a"}`
    );
    return `Top ${top5.length} pools by liquidity:\n${lines.join("\n")}`;
  });
}
