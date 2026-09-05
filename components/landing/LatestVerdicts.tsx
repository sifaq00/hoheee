import Link from "next/link";
import Reveal from "./Reveal";

interface LatestVerdict {
  id: string;
  symbol: string;
  rating: string | null;
  created_at: string;
}

async function getLatest(): Promise<LatestVerdict[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    const res = await fetch(`${url}/rest/v1/reports?select=id,token,rating,created_at&order=created_at.desc&limit=3`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { id: string; token?: { symbol?: string }; rating?: string; created_at?: string }[];
    return data.map((r) => ({ id: r.id, symbol: r.token?.symbol ?? "?", rating: r.rating ?? "?", created_at: (r.created_at ?? "").slice(0, 10) }));
  } catch {
    return [];
  }
}

export default async function LatestVerdicts() {
  const items = await getLatest();
  if (items.length === 0) return null;
  return (
    <section className="border-t border-black/[0.07]" aria-labelledby="latest-title">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] text-[#15803d] uppercase">Fresh off the desk</p>
            <h2 id="latest-title" className="font-display mt-3 text-3xl font-medium tracking-tight text-black sm:text-4xl">
              Latest verdicts
            </h2>
          </div>
          <Link href="/analyze" className="cursor-pointer font-mono text-[13px] font-medium text-black">
            Run yours <span className="text-[#15803d]">→</span>
          </Link>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {items.map((v, i) => (
            <Reveal key={v.id} delay={i * 90} className="h-full">
              <Link
                href={`/r/${v.id}`}
                className="flex h-full cursor-pointer flex-col gap-1 rounded-md border border-black/10 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#16a34a] hover:shadow-[0_16px_40px_rgba(0,0,0,0.1)]"
              >
                <p className="font-display text-xl font-bold text-black">{v.symbol}</p>
                <p className="font-mono text-sm font-bold text-[#15803d]">{v.rating}</p>
                <p className="mt-auto font-mono text-[11px] text-zinc-500 tabular-nums">{v.created_at}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
