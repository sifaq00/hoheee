import { fmtNum as num } from "../format";

export interface RugRisk {
  name?: string;
  level?: string;
  score?: number;
}

export interface TopHolder {
  address?: string;
  owner?: string;
  pct?: number;
  insider?: boolean;
  uiAmountString?: string;
}

export interface RugReport {
  score?: number;
  score_normalised?: number;
  rugged?: boolean;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  totalHolders?: number;
  totalMarketLiquidity?: number;
  totalLPProviders?: number;
  risks?: RugRisk[];
  topHolders?: TopHolder[];
}

const API = "https://api.rugcheck.xyz/v1/tokens";

class NotFoundError extends Error {}

async function fetchReport(mint: string): Promise<RugReport> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${API}/${mint}/report`, { signal: controller.signal });
    if (res.status === 404) throw new NotFoundError("404");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as RugReport;
  } finally {
    clearTimeout(timer);
  }
}

function withRugError(name: string, mint: string, fn: () => Promise<string>): Promise<string> {
  return fn().catch((err: unknown) => {
    if (err instanceof NotFoundError) return "RugCheck report not available";
    const msg = err instanceof Error ? err.message : String(err);
    return `RugCheck error: ${msg} (mint ${mint})`;
  });
}

function auth(v: string | null | undefined): string {
  return v === null || v === undefined ? "revoked (null)" : `ACTIVE — ${v}`;
}

/** Summarize the RugCheck risk report for a Solana token mint. */
export async function getRiskReport(mint: string): Promise<string> {
  return withRugError("getRiskReport", mint, async () => {
    const r = await fetchReport(mint);
    const risks = (r.risks ?? [])
      .map((k) => `- ${k.name ?? "?"} (level: ${k.level ?? "?"}, score: ${k.score ?? "?"})`)
      .join("\n");
    return [
      `RugCheck score: ${r.score ?? "n/a"} (normalised: ${r.score_normalised ?? "n/a"}), rugged: ${r.rugged ?? "?"}`,
      `mint authority: ${auth(r.mintAuthority)}`,
      `freeze authority: ${auth(r.freezeAuthority)}`,
      `Holders: ${r.totalHolders ?? "n/a"} | LP providers: ${r.totalLPProviders ?? "n/a"} | liquidity: $${num(r.totalMarketLiquidity)}`,
      risks ? `Risks:\n${risks}` : "No risk flags listed",
    ].join("\n");
  });
}

/** Summarize top-holder distribution for a Solana token mint from RugCheck. */
export async function getHolderDistribution(mint: string): Promise<string> {
  return withRugError("getHolderDistribution", mint, async () => {
    const r = await fetchReport(mint);
    const top = (r.topHolders ?? []).slice(0, 10);
    const lines = top.map(
      (h, i) =>
        `${i + 1}. ${h.owner ?? h.address ?? "?"} — ${(h.pct ?? 0).toFixed(2)}%${h.insider ? " [INSIDER]" : ""}`
    );
    const topPct = top.reduce((s, h) => s + (h.pct ?? 0), 0);
    const insiders = top.filter((h) => h.insider).length;
    return [
      `Total holders: ${r.totalHolders ?? "n/a"}`,
      `Top ${top.length} holders control ${topPct.toFixed(2)}% of supply (${insiders} flagged as insider)`,
      ...lines,
    ].join("\n");
  });
}
