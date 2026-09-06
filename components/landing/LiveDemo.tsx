"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Reveal from "./Reveal";

const SCRIPT: { tag: string; text: string; tone: "dim" | "green" | "red" | "white" }[] = [
  { tag: "mint", text: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", tone: "dim" },
  { tag: "L1", text: "token_found — Bonk ($0.0000204 · liq $1.02M · +5.2% 24h)", tone: "green" },
  { tag: "L1", text: "onchain ✓ 12.4k holders · mint+freeze revoked · top holder 13.7%", tone: "green" },
  { tag: "L1", text: "technical ✓ uptrend · RSI 61 · Raydium + Orca venues", tone: "green" },
  { tag: "L1", text: "sentiment ✓ organic chatter rising, no bot spikes", tone: "green" },
  { tag: "L1", text: "news ✓ listing rumor circulating, unconfirmed", tone: "green" },
  { tag: "L2", text: "bull r1 → breakout setup, depth supports size", tone: "white" },
  { tag: "L2", text: "bear r1 → top-10 hold 38%, thin exit if panic", tone: "red" },
  { tag: "L2", text: "bull r2 → distribution steady, no insider dump yet", tone: "white" },
  { tag: "L2", text: "bear r2 → rumor already priced in, fade the pop", tone: "red" },
  { tag: "L3", text: "risk ✓ ~4% slippage on $10k exit · rug paths closed", tone: "green" },
  { tag: "L4", text: "RATING: Overweight · CONFIDENCE: Medium · /r/aa7bc851", tone: "green" },
];

const TONE: Record<string, string> = {
  dim: "text-zinc-500",
  green: "text-[#22c55e]",
  red: "text-[#ef4444]",
  white: "text-zinc-200",
};

export default function LiveDemo() {
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [count, setCount] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? SCRIPT.length : 0
  );
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setCount((c) => (c >= SCRIPT.length ? 0 : c + 1));
    }, 900);
    return () => clearInterval(id);
  }, [reduced]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [count]);

  const visible = reduced ? SCRIPT : SCRIPT.slice(0, count);

  return (
    <section id="live" className="mx-auto max-w-6xl scroll-mt-24 border-t border-black/[0.07] px-4 py-16 md:py-24" aria-labelledby="live-title">
      <Reveal className="text-center">
        <p className="font-mono text-[10px] tracking-[0.22em] text-[#15803d] uppercase">02 — Sample run</p>
        <h2 id="live-title" className="font-display mt-3 text-3xl font-medium tracking-tight text-black sm:text-4xl">
          A real run, replayed
        </h2>
        <p className="mx-auto mt-3 max-w-md font-mono text-xs leading-relaxed text-zinc-500">
          Reconstructed from a live BONK analysis. The real thing streams the same way, token by token.
        </p>
      </Reveal>
      <Reveal delay={120}>
        <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded border border-white/10 bg-black">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]/70" />
            <span className="ml-3 font-mono text-[10px] tracking-widest text-zinc-500">ARIES // SAMPLE RUN · BONK</span>
            <button
              type="button"
              onClick={() => setCount(0)}
              aria-label="Replay sample run"
              className="ml-auto cursor-pointer font-mono text-[10px] tracking-widest text-zinc-500 transition-colors hover:text-[#22c55e]"
            >
              ↺ REPLAY
            </button>
            <span aria-hidden="true" className="land-caret font-mono text-xs text-[#22c55e]">
              ▊
            </span>
          </div>
          <div ref={feedRef} className="thin-scroll flex h-72 flex-col gap-1.5 overflow-y-auto overflow-x-hidden p-4 font-mono text-xs leading-relaxed" aria-live="off">
            {visible.map((l, i) => (
              <p key={`${i}-${l.text}`} className={`${TONE[l.tone]} break-all`}>
                <span className="mr-2 inline-block w-7 text-zinc-600">[{l.tag}]</span>
                {l.text}
              </p>
            ))}
            {!reduced && count < SCRIPT.length && (
              <p className="text-zinc-600">
                <span className="mr-2 inline-block w-7">[…]</span>streaming…
              </p>
            )}
          </div>
          <div className="border-t border-white/10 p-4">
            <Link
              href="/analyze"
              className="block cursor-pointer rounded border border-[#22c55e] bg-[#22c55e] px-4 py-2 text-center font-mono text-sm font-bold text-black transition-colors duration-200 hover:bg-transparent hover:text-[#22c55e]"
            >
              Try it on a real token
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
