import DebateCard from "@/components/DebateCard";
import type { DebateTurn } from "@/lib/layered/types";

export default function DebateSection({ debate }: { debate: DebateTurn[] }) {
  if (debate.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-label="Debate">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">L2 — Debate ({debate.length})</h2>
      <div className="flex flex-col gap-3">
        {debate.map((d, i) => (
          <DebateCard key={i} phase={d.phase} round={d.round} side={d.side} text={d.text} />
        ))}
      </div>
    </section>
  );
}
