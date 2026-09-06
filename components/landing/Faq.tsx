import Reveal from "./Reveal";

const FAQS = [
  { q: "How long does a run take?", a: "A few minutes. Four analysts run in parallel, debate goes two rounds, risk reviews, decider seals it. Every step streams live so waiting feels like watching, not loading." },
  { q: "Is this financial advice?", a: "No. Aries is a research tool. Output is automated analysis with stated confidence — it can be wrong, especially on new tokens with thin data." },
  { q: "Do I need a wallet?", a: "Yes. Connect a wallet (Solana or EVM) to run analysis — reports save to your wallet history automatically." },
  { q: "What does a run cost me?", a: "Nothing during the demo — but each run burns real model tokens behind the scenes, so runs are throttled per IP." },
  { q: "Which tokens work?", a: "Solana mints plus Ethereum, BNB Chain, Base and Robinhood contracts, plus native Bitcoin — with DexScreener coverage. Very new tokens analyze fine, but expect MISSING reports and lower confidence." },
];

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-black/[0.07] bg-[#f5f6f7]" aria-labelledby="faq-title">
      <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
        <Reveal className="text-center">
          <p className="font-mono text-[10px] tracking-[0.22em] text-[#15803d] uppercase">05 — FAQ</p>
          <h2 id="faq-title" className="font-display mt-3 text-3xl font-medium tracking-tight text-black sm:text-4xl">
            Straight answers
          </h2>
        </Reveal>
        <div className="mt-8 flex flex-col gap-3">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="group rounded border border-black/10 bg-white px-4 py-3">
                <summary className="cursor-pointer list-none font-mono text-sm font-bold text-black marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="mr-2 inline-block text-[#16a34a] transition-transform duration-200 group-open:rotate-90">▶</span>
                  {f.q}
                </summary>
                <p className="mt-2 pl-6 text-[13px] leading-relaxed text-zinc-600">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
