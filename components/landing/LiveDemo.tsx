"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Reveal from "./Reveal";

const SCRIPT: { tag: string; text: string; tone: "dim" | "green" | "red" | "white" }[] = [
  { tag: "L1", text: "onchain ✓ holders 12.4k · liq $1.2M · freeze revoked", tone: "green" },
  { tag: "L1", text: "technical ✓ trend up · momentum strong · 2 venues", tone: "green" },
  { tag: "L1", text: "sentiment ✓ organic chatter rising", tone: "green" },
  { tag: "L1", text: "news ✓ exchange listing rumor, unconfirmed", tone: "green" },
  { tag: "L2", text: "bull r1 → breakout setup, liquidity supports entry", tone: "white" },
  { tag: "L2", text: "bear r1 → top-10 hold 38%, thin exit if panic", tone: "red" },
  { tag: "L2", text: "bull r2 → distribution steady, no insider dump", tone: "white" },
  { tag: "L2", text: "bear r2 → listing rumor already priced in", tone: "red" },
  { tag: "L3", text: "risk → slippage ~4% on $10k exit · rug paths closed", tone: "green" },
  { tag: "L4", text: "RATING: Overweight · CONFIDENCE: Medium", tone: "green" },
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

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setCount((c) => (c >= SCRIPT.length ? 0 : c + 1));
    }, 900);
    return () => clearInterval(id);
  }, [reduced]);

  const visible = reduced ? SCRIPT : SCRIPT.slice(0, count);

  return (
    <section id="live" className="mx-auto max-w-6xl scroll-mt-24 border-t border-black/[0.07] px-4 py-16 md:py-24" aria-labelledby="live-title">
      <Reveal className="text-center">
        <p className="font-mono text-[10px] tracking-[0.22em] text-[#15803d] uppercase">02 — Live loop</p>
        <h2 id="live-title" className="font-display mt-3 text-3xl font-medium tracking-tight text-black sm:text-4xl">
          Watch a run, end to end
        </h2>
        <p className="mx-auto mt-3 max-w-md font-mono text-xs leading-relaxed text-zinc-500">
          Simulated feed. The real thing streams the same way, token by token.
        </p>
      </Reveal>
      <Reveal delay={120}>
        <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded border border-white/10 bg-black">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]/70" />
            <span className="ml-3 font-mono text-[10px] tracking-widest text-zinc-500">ARIES // LIVE FEED</span>
            <span aria-hidden="true" className="land-caret ml-auto font-mono text-xs text-[#22c55e]">
              ▊
            </span>
          </div>
          <div className="flex min-h-64 flex-col gap-1.5 p-4 font-mono text-xs leading-relaxed" aria-live="off">
            {visible.map((l, i) => (
              <p key={`${i}-${l.text}`} className={TONE[l.tone]}>
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
