import { fmtNum as num } from "../format";

const BASE = "https://api.coingecko.com/api/v3";
const UA = "aries-research/0.1";

interface CoinMeta {
  id?: string;
  categories?: string[];
  description?: { en?: string };
  watchlist_portfolio_users?: number;
  sentiment_votes_up_percentage?: number | null;
  community_data?: {
    twitter_followers?: number | null;
    telegram_channel_user_count?: number | null;
  } | null;
  market_data?: {
    current_price?: { usd?: number };
    ath?: { usd?: number };
    ath_change_percentage?: { usd?: number };
    total_volume?: { usd?: number };
  };
}

class NotListedError extends Error {}

async function cgFetch(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (res.status === 404) throw new NotListedError("404");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function resolveId(mint: string): Promise<string> {
  const data = await cgFetch(`${BASE}/coins/solana/contract/${mint}`);
  const id = (data as { id?: string }).id;
  if (!id) throw new NotListedError("no id");
  return id;
}

function withCgError(name: string, mint: string, fn: () => Promise<string>): Promise<string> {
  return fn().catch((err: unknown) => {
    if (err instanceof NotListedError) return "Coin not listed on CoinGecko";
    const msg = err instanceof Error ? err.message : String(err);
    return `CoinGecko error: ${msg} (mint ${mint})`;
  });
}

/** Resolve mint -> CoinGecko id, then fetch coin metadata (categories, description, sentiment, market data). */
export async function getCoinMetadata(mint: string): Promise<string> {
  return withCgError("getCoinMetadata", mint, async () => {
    const id = await resolveId(mint);
    const c = (await cgFetch(
      `${BASE}/coins/${id}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false`
    )) as CoinMeta;
    const desc = (c.description?.en ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
    const sentiment = c.sentiment_votes_up_percentage;
    const twitter = c.community_data?.twitter_followers ?? null;
    return [
      `CoinGecko: ${c.id ?? id}`,
      `Categories: ${(c.categories ?? []).join(", ") || "none"}`,
      `Description: ${desc || "not available"}`,
      `Watchlist users: ${c.watchlist_portfolio_users ?? "not available"}`,
      `Sentiment (up votes): ${sentiment !== null && sentiment !== undefined ? `${sentiment}%` : "not available"}`,
      `Community: ${twitter ? `twitter ${num(twitter)} followers` : "not available"}`,
      `Price: $${c.market_data?.current_price?.usd ?? "n/a"} | 24h volume: $${num(c.market_data?.total_volume?.usd)}`,
      `ATH: $${c.market_data?.ath?.usd ?? "n/a"} (${c.market_data?.ath_change_percentage?.usd ?? "n/a"}% from ATH)`,
    ].join("\n");
  });
}

/** Resolve mint -> CoinGecko id, then fetch 30-day daily price history. */
export async function getPriceHistory(mint: string): Promise<string> {
  return withCgError("getPriceHistory", mint, async () => {
    const id = await resolveId(mint);
    const data = await cgFetch(
      `${BASE}/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`
    );
    const prices = (data as { prices?: [number, number][] }).prices ?? [];
    const lines = prices.map(([ts, p]) => {
      const d = new Date(ts).toISOString().slice(0, 10);
      return `${d}: $${Number(p.toPrecision(6))}`;
    });
    if (lines.length === 0) return "CoinGecko error: no price data returned";
    return `30-day daily price history (USD):\n${lines.join("\n")}`;
  });
}
