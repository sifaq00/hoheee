// Shared compact number formatter (K/M/B); single copy for tools + UI.
export function fmtNum(n: number | string | undefined | null): string {
  if (n === undefined || n === null || n === "") return "n/a";
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "n/a";
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return String(v);
}
