"use client";

import { useEffect, useState } from "react";

const ITEMS = [
  "L1 — 4 ANALYSTS REPORT IN PARALLEL",
  "L2 — BULL VS BEAR · 2 ROUNDS",
  "L3 — RISK REVIEW: LIQUIDITY · RUGPATH · WHALES",
  "L4 — RATING + CONFIDENCE + SHARE LINK",
  "RESEARCH TOOL — NOT FINANCIAL ADVICE",
];

export default function Ticker() {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const h = () => setReduced(m.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);

  const stopped = paused || reduced;

  return (
    <div
      role="region"
      aria-label="Pipeline ticker"
      className="group relative w-full overflow-hidden border-y border-[#22c55e]/20 bg-[#0d120e]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <ul className="land-marquee flex w-max items-center" data-paused={stopped ? "true" : "false"} aria-hidden={reduced ? false : undefined}>
        {[...ITEMS, ...ITEMS].map((t, i) => (
          <li
            key={i}
            aria-hidden={i >= ITEMS.length ? true : undefined}
            className="flex items-center gap-3 border-r border-[#22c55e]/15 px-5 py-3 font-mono text-[10px] tracking-[0.18em] whitespace-nowrap text-[#22c55e] uppercase"
          >
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rotate-45 bg-[#22c55e]" />
            {t}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setPaused((v) => !v)}
        aria-label={stopped ? "Resume ticker" : "Pause ticker"}
        aria-pressed={stopped}
        className="absolute top-1/2 right-2 hidden h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#22c55e]/30 bg-black/60 font-mono text-xs text-[#22c55e] hover:bg-[#22c55e]/20 md:flex"
      >
        {stopped ? "▶" : "❚❚"}
      </button>
    </div>
  );
}
