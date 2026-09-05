import AgentCard from "@/components/AgentCard";
import { RISK_SLOTS, type L3Result } from "@/lib/layered/types";

export default function RiskSection({ risks }: { risks: L3Result["risks"] }) {
  return (
    <div aria-label="Risk review">
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {RISK_SLOTS.map((slot) => (
          <div key={slot} className="min-w-0">
            <AgentCard agent={`risk:${slot}`} status="done" tools={[]} results={[]} report={risks[slot]} />
          </div>
        ))}
      </div>
    </div>
  );
}
