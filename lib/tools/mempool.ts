const API = "https://mempool.space/api";

async function mpGet(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${API}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Native Bitcoin chain stats: hashrate, difficulty, fees, tip height. Never throws. */
export async function getBtcOverview(): Promise<string> {
  try {
    const [hr, diff, fees, height] = await Promise.all([
      mpGet("/v1/mining/hashrate/3d").catch(() => null) as Promise<{ currentHashrate?: number } | null>,
      mpGet("/v1/difficulty-adjustment").catch(() => null) as Promise<{
        progressPercent?: number;
        difficultyChange?: number;
      } | null>,
      mpGet("/v1/fees/recommended").catch(() => null) as Promise<{
        fastestFee?: number;
        halfHourFee?: number;
        hourFee?: number;
      } | null>,
      mpGet("/blocks/tip/height").catch(() => null) as Promise<number | null>,
    ]);
    const ehs = hr?.currentHashrate ? `${(hr.currentHashrate / 1e18).toFixed(2)} EH/s` : "n/a";
    return [
      "Bitcoin native chain (mempool.space)",
      `Hashrate (3d avg): ${ehs}`,
      `Difficulty: ${diff?.difficultyChange !== undefined ? `${diff.difficultyChange.toFixed(2)}% change` : "n/a"} (${diff?.progressPercent !== undefined ? `${diff.progressPercent.toFixed(1)}% into epoch` : "n/a"})`,
      `Fees (sat/vB): fast ${fees?.fastestFee ?? "n/a"} / 30min ${fees?.halfHourFee ?? "n/a"} / 1h ${fees?.hourFee ?? "n/a"}`,
      `Tip height: ${height ?? "n/a"}`,
    ].join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `mempool.space error: ${msg}`;
  }
}
