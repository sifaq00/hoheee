import Reveal from "./Reveal";

const SOURCES = [
  { name: "DexScreener", role: "Market data" },
  { name: "RugCheck", role: "Risk flags" },
  { name: "CoinGecko", role: "Metadata" },
  { name: "Supabase", role: "Storage" },
  { name: "Mimo", role: "Inference" },
];

export default function PoweredBy() {
  return (
    <section className="border-t border-white/[0.07]" aria-label="Data sources">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-2">
        <Reveal>
          <div className="rounded-md bg-[#0c0f0c] px-6 py-7">
            <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
              Reading live markets with sources like these
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-4">
              {SOURCES.map((s) => (
                <div key={s.name} className="flex flex-col gap-1 opacity-70 transition-opacity duration-200 hover:opacity-100">
                  <span className="font-display text-base font-bold tracking-tight text-white">{s.name}</span>
                  <span className="font-mono text-[9px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">{s.role}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
