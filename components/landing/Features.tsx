import Reveal from "./Reveal";

const ITEMS = [
  { title: "Two sides, structurally", desc: "Most tools confirm your bias. Aries forces a bear to attack every bull claim with the same data." },
  { title: "Glass-box process", desc: "Every analyst report, every debate turn, every risk note streams live. You see how it concludes, not just what." },
  { title: "Reports worth sharing", desc: "Each run is a permanent page with rating, risks and transcript — plus a real social card, not a screenshot." },
  { title: "Solana-native", desc: "Holder spread, freeze authority, pool depth, DEX venues. Built for tokens, not retrofitted from stocks." },
  { title: "Honest when thin", desc: "New token, thin data? Reports say MISSING and confidence drops. No invented numbers, ever." },
  { title: "Free demo, real cost", desc: "Every run burns model tokens. Demo runs are IP-throttled; the footer says so instead of hiding it." },
];

export default function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 md:py-20" aria-labelledby="why-title">
      <Reveal className="text-center">
        <p className="font-mono text-[10px] tracking-[0.22em] text-[#22c55e] uppercase">03 — Why Aries</p>
        <h2 id="why-title" className="font-display mt-2 text-2xl font-black text-white sm:text-3xl">
          BUILT FOR MONEY-SIZED DECISIONS
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 90}>
            <article className="h-full rounded border border-white/10 bg-[#0c0f0c] p-5">
              <h3 className="font-mono text-sm font-bold text-[#22c55e]">{f.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{f.desc}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
