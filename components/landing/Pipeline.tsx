import Reveal from "./Reveal";

const STEPS = [
  { n: "L1", title: "Four analysts, parallel", desc: "On-chain, technical, sentiment, news. One tool call each, one paragraph each. Failures degrade honestly, never invented." },
  { n: "L2", title: "Bull vs bear, 2 rounds", desc: "Bull builds the case, bear tears it down — both forced to cite layer-1 data. Transcript streams live." },
  { n: "L3", title: "Risk review", desc: "Liquidity depth, rug paths, whale concentration. Slippage on exit, collapse speed, unclosed doors." },
  { n: "L4", title: "Decider + share link", desc: "Rating, confidence, key risks in machine-parseable shape. Saved to Supabase, link ready to share." },
];

export default function Pipeline() {
  return (
    <section id="how" className="scroll-mt-20 border-t border-white/[0.06] bg-[#0c0f0c]" aria-labelledby="how-title">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <Reveal className="text-center">
          <p className="font-mono text-[10px] tracking-[0.22em] text-[#22c55e] uppercase">01 — How it works</p>
          <h2 id="how-title" className="font-display mt-2 text-2xl font-black text-white sm:text-3xl">
            A TRADING DESK, PER TOKEN
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <article className="group h-full rounded border border-white/10 bg-black p-5 transition-colors duration-200 hover:border-[#22c55e]/60">
                <p className="font-display text-3xl font-black text-[#22c55e]/25 transition-colors duration-200 group-hover:text-[#22c55e]">
                  {s.n}
                </p>
                <h3 className="mt-2 font-mono text-sm font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{s.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
