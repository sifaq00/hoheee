import Reveal from "./Reveal";

const ITEMS = [
  { n: "01", title: "The desk, not the tip", desc: "Any single call can be lucky. So Aries runs a desk — four scouts, a clash, a risk review — and when one layer is thin the next already covers it." },
  { n: "02", title: "Ship verdicts, not vibes", desc: "The unit of progress is a finished report: rating, confidence, key risks, transcript, share link. If it is not readable, it is not done." },
  { n: "03", title: "Built on live markets", desc: "DexScreener pools, RugCheck flags, CoinGecko metadata — read while the token moves, scored before you touch it. Stale data is labeled, never hidden." },
];

export function SectionHead({ no, title, lede }: { no: string; title: string; lede: string }) {
  return (
    <Reveal>
      <p className="font-mono text-[10px] tracking-[0.22em] text-[#22c55e] uppercase">{no}</p>
      <h2 className="font-display mt-3 text-3xl font-medium tracking-tight text-white sm:text-4xl">{title}</h2>
      <p className="mt-3 max-w-xl font-mono text-sm leading-relaxed text-zinc-400">{lede}</p>
    </Reveal>
  );
}

export default function Principles() {
  return (
    <section id="how" className="scroll-mt-24 border-t border-white/[0.07]" aria-labelledby="how-title">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div id="how-title">
          <SectionHead no="01 — How it works" title="How the desk works" lede="Four layers, one verdict. Each layer reads the previous one — nothing is decided in isolation." />
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {ITEMS.map((p, i) => (
            <Reveal key={p.n} delay={i * 90}>
              <article className="h-full border-t border-white/20 pt-6">
                <p className="font-mono text-[13px] font-semibold tracking-[0.1em] text-[#22c55e]">{p.n}</p>
                <h3 className="font-display mt-3 text-xl font-semibold text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{p.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
