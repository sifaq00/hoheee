"use client";

import { useEffect, useState } from "react";
import type { HistoryItem } from "@/lib/layered/supabase";

export default function HistorySection({ wallet }: { wallet: string }) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [stats, setStats] = useState<{ runs: number; lastRun: string | null } | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- external fetch per wallet */
  useEffect(() => {
    let alive = true;
    setItems(null);
    setStats(null);
    fetch(`/api/history?wallet=${encodeURIComponent(wallet)}`)
      .then((r) => (r.ok ? r.json() : { reports: [], stats: null }))
      .then((d) => {
        if (!alive) return;
        setItems((d.reports ?? []) as HistoryItem[]);
        setStats((d.stats ?? null) as { runs: number; lastRun: string | null } | null);
      })
      .catch(() => {
        if (!alive) return;
        setItems([]);
        setStats(null);
      });
    return () => {
      alive = false;
    };
  }, [wallet]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (items === null || items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-label="Your reports">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Your reports ({items.length})
        {stats && stats.runs > 0 && (
          <span className="ml-2 normal-case tracking-normal">
            · {stats.runs} completed{stats.lastRun ? ` · last ${stats.lastRun.slice(0, 10)}` : ""}
          </span>
        )}
      </h2>
      <ul className="flex flex-col gap-1">
        {items.map((r) => (
          <li key={r.id}>
            <a href={`/r/${r.id}`} className="flex items-baseline justify-between gap-3 rounded border border-zinc-800 px-3 py-2 text-sm hover:border-[#22c55e]">
              <span className="font-mono">
                {r.symbol} <span className="text-zinc-500">{r.mint.slice(0, 6)}…</span>
              </span>
              <span className="text-zinc-400">{r.rating}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
