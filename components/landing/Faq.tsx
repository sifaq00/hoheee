import Reveal from "./Reveal";

const FAQS = [
  { q: "How long does a run take?", a: "A few minutes. Four analysts run in parallel, debate goes two rounds, risk reviews, decider seals it. Every step streams live so waiting feels like watching, not loading." },
  { q: "Is this financial advice?", a: "No. Aries is a research tool. Output is automated analysis with stated confidence — it can be wrong, especially on new tokens with thin data." },
  { q: "Do I need a wallet?", a: "No. Wallet connect is optional and only unlocks your personal report history on this device. Analysis works without it." },
  { q: "What does a run cost me?", a: "Nothing during the demo — but each run burns real model tokens behind the scenes, so runs are throttled per IP." },
  { q: "Which tokens work?", a: "Solana mints with DexScreener coverage. Very new tokens analyze fine, but expect MISSING reports and lower confidence." },
];

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-white/[0.06] bg-[#0c0f0c]" aria-labelledby="faq-title">
      <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
        <Reveal className="text-center">
          <p className="font-mono text-[10px] tracking-[0.22em] text-[#22c55e] uppercase">04 — FAQ</p>
          <h2 id="faq-title" className="font-display mt-2 text-2xl font-black text-white sm:text-3xl">
            STRAIGHT ANSWERS
          </h2>
        </Reveal>
        <div className="mt-8 flex flex-col gap-3">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="group rounded border border-white/10 bg-black px-4 py-3">
                <summary className="cursor-pointer list-none font-mono text-sm font-bold text-white marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="mr-2 inline-block text-[#22c55e] transition-transform duration-200 group-open:rotate-90">▶</span>
                  {f.q}
                </summary>
                <p className="mt-2 pl-6 text-[13px] leading-relaxed text-zinc-400">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
