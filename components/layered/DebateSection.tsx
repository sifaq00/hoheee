import DebateCard from "@/components/DebateCard";
import type { DebateTurn } from "@/lib/layered/types";

export default function DebateSection({ debate, pending }: { debate: DebateTurn[]; pending: boolean }) {
  if (debate.length === 0 && !pending) return null;
  return (
    <div className="flex flex-col gap-3" aria-label="Debate">
      <div className="flex flex-col gap-3">
        {debate.map((d, i) => (
          <div key={`${d.round}-${d.side}`} className="anim-in" style={{ animationDelay: `${Math.min(i * 80, 320)}ms` }}>
            <DebateCard phase={d.phase} round={d.round} side={d.side} text={d.text} />
          </div>
        ))}
        {pending && (
          <div aria-label="Next turn loading" className="skeleton rounded border border-zinc-800 bg-zinc-950 p-4">
            <p className="font-mono text-xs font-bold tracking-wider text-zinc-500 uppercase">next turn</p>
            <div aria-hidden="true" className="mt-3 flex flex-col gap-2">
              <span className="h-2 w-3/5 rounded bg-zinc-800" />
              <span className="h-2 w-11/12 rounded bg-zinc-800" />
              <span className="h-2 w-2/3 rounded bg-zinc-800" />
            </div>
            <p className="mt-2 font-mono text-xs text-[#22c55e]">
              arguing<span className="land-caret">…</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
