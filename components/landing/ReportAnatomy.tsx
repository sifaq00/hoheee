import Link from "next/link";
import Reveal from "./Reveal";
import { SectionHead } from "./Principles";

const CARDS = [
  { tag: "Verdict first", title: "Rating on top", desc: "Buy to Sell, confidence attached, key risks before the fold. The answer loads before the homework.", live: false },
  { tag: "Full transcript", title: "Bull vs bear, round by round", desc: "Four turns of cited argument. Watch conviction survive contact with the bear case.", live: false },
  { tag: "Risk signed", title: "Liquidity · rugpath · whales", desc: "Exit slippage, authority status, concentration — the three ways tokens actually kill you.", live: false },
  { tag: "Permanent", title: "One link per report", desc: "Saved to Supabase with a real social card. Send it, quote it, come back to it.", live: true },
];

export default function ReportAnatomy() {
  return (
    <section id="report" className="scroll-mt-24 border-t border-white/[0.07]" aria-labelledby="report-title">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div id="report-title">
          <SectionHead no="03 — Anatomy" title="Built here. Running now." lede="Not decks, not prototypes. Every run below is the same pipeline you get on /analyze — live in production today." />
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={(i % 2) * 90}>
              <article className={`flex h-full flex-col gap-3 rounded-md border border-white/10 bg-[#0c0f0c] p-7 ${c.live ? "border-[#22c55e] bg-[#22c55e]" : ""}`}>
                <p className={`font-mono text-[11px] font-semibold tracking-[0.14em] uppercase ${c.live ? "text-black/60" : "text-zinc-500"}`}>{c.tag}</p>
                <h3 className={`font-display text-2xl font-medium tracking-tight ${c.live ? "text-black" : "text-white"}`}>{c.title}</h3>
                <p className={`flex-1 text-sm leading-relaxed ${c.live ? "text-black/70" : "text-zinc-400"}`}>{c.desc}</p>
                <Link href="/analyze" className={`cursor-pointer font-mono text-[13px] font-medium ${c.live ? "text-black" : "text-white"}`}>
                  Try it <span className="text-[#22c55e]">→</span>
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
