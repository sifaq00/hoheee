import type { ReactNode } from "react";

export default function SectionPanel({ index, title, meta, children }: { index: string; title: string; meta?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="overflow-hidden rounded border border-white/10 bg-[#0c0f0c]">
      <header className="flex items-center gap-3 border-b border-white/10 bg-black/60 px-4 py-2.5">
        <span className="font-display text-sm font-black text-[#22c55e]/70">{index}</span>
        <h2 className="font-mono text-xs font-bold tracking-[0.18em] text-white uppercase">{title}</h2>
        {meta && <span className="ml-auto font-mono text-[10px] tracking-wider text-zinc-500">{meta}</span>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
