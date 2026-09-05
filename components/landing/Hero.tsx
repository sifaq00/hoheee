"use client";

import Link from "next/link";
import Reveal from "./Reveal";

const STATS = [
  { k: "4", label: "AI analysts per token" },
  { k: "2", label: "Bull vs bear rounds" },
  { k: "3", label: "Risk reviewers" },
  { k: "~99s", label: "Full run, live demo" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-14 md:pt-36 md:pb-20" aria-labelledby="hero-title">
      <div aria-hidden="true" className="land-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 md:flex-row md:gap-14">
        <div className="max-w-xl flex-1 text-center md:text-left">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1 font-mono text-[10px] tracking-[0.22em] text-[#22c55e] uppercase">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22c55e]" /> Solana token research squad
            </p>
          </Reveal>
          <Reveal delay={90}>
            <h1 id="hero-title" className="font-display mt-5 text-4xl leading-[1.02] font-black tracking-tight text-white sm:text-5xl md:text-6xl">
              FOUR ANALYSTS.
              <br />
              TWO SIDES. <span className="text-[#22c55e]">ONE VERDICT.</span>
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="mx-auto mt-5 max-w-md font-mono text-[13px] leading-relaxed text-zinc-400 md:mx-0">
              Paste a mint. On-chain, technical, sentiment and news agents report in parallel, bull fights bear for two rounds, risk team
              signs off — then you get a rating you can read, share and verify.
            </p>
          </Reveal>
          <Reveal delay={260}>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <Link
                href="/analyze"
                className="cursor-pointer rounded border border-[#22c55e] bg-[#22c55e] px-6 py-2.5 font-mono text-sm font-bold text-black transition-all duration-200 hover:bg-transparent hover:text-[#22c55e]"
              >
                Analyze a token
              </Link>
              <a
                href="#live"
                className="cursor-pointer rounded border border-zinc-700 px-6 py-2.5 font-mono text-sm text-zinc-300 transition-colors duration-200 hover:border-[#22c55e] hover:text-[#22c55e]"
              >
                Watch it work ↓
              </a>
            </div>
          </Reveal>
          <Reveal delay={340}>
            <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded border border-white/[0.07] bg-white/[0.07] sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="bg-[#0a0a0a] px-4 py-3 text-center md:text-left">
                  <dt className="order-2 mt-1 block font-mono text-[10px] tracking-wider text-zinc-500 uppercase">{s.label}</dt>
                  <dd className="font-display text-2xl font-bold text-[#22c55e]">{s.k}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal delay={200} className="relative mx-auto w-64 shrink-0 sm:w-80">
          <div className="land-radar relative aspect-square" role="img" aria-label="Aries ram logo with scanning radar">
            {/* eslint-disable-next-line @next/next/no-img-element -- static local webp */}
            <img src="/logo.webp" alt="" width={320} height={320} className="relative z-10 h-full w-full rounded-full object-cover" />
            <span aria-hidden="true" className="land-sweep" />
            <span aria-hidden="true" className="land-ring land-ring-1" />
            <span aria-hidden="true" className="land-ring land-ring-2" />
            <span aria-hidden="true" className="land-ring land-ring-3" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
