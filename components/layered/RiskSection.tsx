import AgentCard from "@/components/AgentCard";
import { RISK_SLOTS, type L3Result } from "@/lib/layered/types";

export default function RiskSection({ risks }: { risks: L3Result["risks"] }) {
  return (
    <section className="flex flex-col gap-3" aria-label="Risk review">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">L3 — Risk review (3/3)</h2>
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {RISK_SLOTS.map((slot) => (
          <div key={slot} className="min-w-0">
            <AgentCard agent={`risk:${slot}`} status="done" tools={[]} results={[]} report={risks[slot]} />
          </div>
        ))}
      </div>
    </section>
  );
}
