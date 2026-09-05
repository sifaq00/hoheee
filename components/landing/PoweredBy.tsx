import Reveal from "./Reveal";

const SOURCES = [
  { name: "DexScreener", role: "Market data", logo: "/sources/dexscreener.png" },
  { name: "RugCheck", role: "Risk flags", logo: "/sources/rugcheck.png" },
  { name: "CoinGecko", role: "Metadata", logo: "/sources/coingecko.png" },
  { name: "Supabase", role: "Storage", logo: "/sources/supabase.svg" },
  { name: "Mimo", role: "Inference", logo: null },
];

export default function PoweredBy() {
  return (
    <section className="border-t border-black/[0.07]" aria-label="Data sources">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-2">
        <Reveal>
          <div className="rounded-md bg-[#f5f6f7] px-6 py-7">
            <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
              Reading live markets with sources like these
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-4">
              {SOURCES.map((s) => (
                <div key={s.name} className="flex items-center gap-3 opacity-70 transition-opacity duration-200 hover:opacity-100">
                  {s.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- static local asset
                    <img src={s.logo} alt={`${s.name} logo`} width={30} height={30} className="h-[30px] w-[30px] rounded-md object-contain" />
                  ) : (
                    <span aria-hidden="true" className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-black font-mono text-xs font-bold text-[#22c55e]">
                      Mi
                    </span>
                  )}
                  <span className="leading-none">
                    <span className="font-display block text-base font-bold leading-none tracking-tight text-black">{s.name}</span>
                    <span className="font-mono mt-1 block text-[9px] font-semibold leading-none tracking-[0.18em] text-zinc-500 uppercase">{s.role}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
