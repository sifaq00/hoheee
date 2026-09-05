import AgentCard from "@/components/AgentCard";
import { RISK_SLOTS, type L3Result } from "@/lib/layered/types";

export default function RiskSection({ risks, pending }: { risks: L3Result["risks"] | null; pending: boolean }) {
  if (!risks && !pending) return null;
  const done = risks ? RISK_SLOTS : [];
  return (
    <div aria-label="Risk review">
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {done.map((slot, i) => (
          <div key={slot} className="anim-in min-w-0" style={{ animationDelay: `${Math.min(i * 80, 240)}ms` }}>
            <AgentCard agent={`risk:${slot}`} status="done" tools={[]} results={[]} report={risks![slot]} />
          </div>
        ))}
        {pending &&
          RISK_SLOTS.filter((s) => !risks?.[s]).map((slot) => (
            <div key={slot} aria-label={`${slot} reviewing`} className="skeleton min-w-0 rounded border border-zinc-800 bg-zinc-950 p-4">
              <p className="font-mono text-xs font-bold tracking-wider text-zinc-500 uppercase">risk:{slot}</p>
              <div aria-hidden="true" className="mt-3 flex flex-col gap-2">
                <span className="h-2 w-4/5 rounded bg-zinc-800" />
                <span className="h-2 w-full rounded bg-zinc-800" />
              </div>
              <p className="mt-2 font-mono text-xs text-[#22c55e]">reviewing…</p>
            </div>
          ))}
      </div>
    </div>
  );
}
