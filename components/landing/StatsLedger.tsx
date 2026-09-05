import Link from "next/link";
import Reveal from "./Reveal";
import { SectionHead } from "./Principles";

const STATS = [
  { v: "4+3+1", k: "Agents per run" },
  { v: "~99s", k: "Median full run" },
  { v: "2", k: "Debate rounds" },
  { v: "24/7", k: "Desk never sleeps" },
];

const FEED = [
  { cost: "L4 sealed", label: "Overweight · Medium" },
  { cost: "L3 signed", label: "3/3 risk notes" },
  { cost: "L2 clashed", label: "4 turns cited" },
];

export default function StatsLedger() {
  return (
    <section id="numbers" className="scroll-mt-24 border-t border-black/[0.07]" aria-labelledby="numbers-title">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div id="numbers-title">
          <SectionHead no="04 — Numbers" title="Every run leaves a record." lede="Verdict, transcript and risk notes persist per report — with read counts, so the best calls surface themselves." />
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="rounded-xl border border-black/10 bg-white p-6 shadow-[0_3px_14px_rgba(0,0,0,0.07)]">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">Run ledger</p>
                <p className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-[#15803d] uppercase">
                  <span className="land-live-dot" aria-hidden="true" /> Live
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-6">
                {STATS.map((s) => (
                  <div key={s.k} className="border-t border-black/10 py-3">
                    <p className="font-display text-2xl font-medium text-black tabular-nums">{s.v}</p>
                    <p className="mt-1 text-xs text-zinc-500">{s.k}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-col gap-2 border-t border-black/10 pt-4">
                {FEED.map((f) => (
                  <p key={f.cost} className="flex justify-between font-mono text-xs text-zinc-500 tabular-nums">
                    <span>{f.label}</span>
                    <b className="font-medium text-black">{f.cost}</b>
                  </p>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
                Illustrative ledger. Your runs persist to Supabase with per-report read counts.
              </p>
            </div>
          </Reveal>
          <div className="flex flex-col justify-center gap-5">
            <Reveal delay={100}>
              <h3 className="font-display text-2xl font-bold text-black">One link. The whole case.</h3>
              <p className="mt-2 max-w-md font-mono text-sm leading-relaxed text-zinc-600">
                Each verdict mints a permanent page: rating up top, transcript and risk notes below, social card included. Built to be sent
                around, not screenshotted.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/analyze"
                  className="cursor-pointer rounded-md bg-[#22c55e] px-6 py-3 font-mono text-sm font-bold text-black transition-colors hover:bg-[#4ade80]"
                >
                  Mint your first report
                </Link>
                <a
                  href="#faq"
                  className="cursor-pointer rounded-md border border-white/20 px-6 py-3 font-mono text-sm text-white transition-colors hover:border-[#22c55e] hover:text-[#22c55e]"
                >
                  Read the FAQ
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
