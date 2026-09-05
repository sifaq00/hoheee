import TokenCard from "@/components/TokenCard";
import AgentCard from "@/components/AgentCard";
import type { L1Result } from "@/lib/layered/types";
import type { LayerError } from "@/lib/layered/types";

const ORDER: (keyof L1Result["reports"])[] = ["onchain", "technical", "sentiment", "news"];

export default function AnalystsSection({
  token,
  symbol,
  reports,
  errors = [],
}: {
  token: L1Result["token"];
  symbol: string;
  reports: Partial<L1Result["reports"]>;
  errors?: LayerError[];
}) {
  const done = ORDER.filter((k) => reports[k]).length;
  const reason = (agent: string) => errors.find((e) => e.agent === agent)?.message;
  return (
    <div className="flex flex-col gap-3" aria-label="Analyst reports" aria-live="off">
      <TokenCard name={token.name} symbol={symbol} price={token.price} liquidity={token.liquidity} change24h={token.change24h} />
      <div className="grid items-start gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {ORDER.map((key, i) =>
          reports[key] ? (
            <div key={key} className="anim-in min-w-0" style={{ animationDelay: `${Math.min(i * 80, 240)}ms` }}>
              <AgentCard agent={key} status="done" tools={[]} results={[]} report={reports[key] ?? null} />
              {reports[key]?.includes("REPORT UNAVAILABLE") && reason(key) && (
                <p className="mt-1 font-mono text-[10px] text-zinc-600">cause: {reason(key)}</p>
              )}
            </div>
          ) : (
            <div key={key} aria-label={`${key} running`} className="skeleton min-w-0 rounded border border-zinc-800 bg-zinc-950 p-4">
              <p className="font-mono text-xs font-bold tracking-wider text-zinc-500 uppercase">{key}</p>
              <div aria-hidden="true" className="mt-3 flex flex-col gap-2">
                <span className="h-2 w-11/12 rounded bg-zinc-800" />
                <span className="h-2 w-full rounded bg-zinc-800" />
                <span className="h-2 w-4/5 rounded bg-zinc-800" />
              </div>
              <p className="mt-2 font-mono text-xs text-[#22c55e]">scouting…</p>
            </div>
          )
        )}
      </div>
      <p className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase">{done}/4 scouts in</p>
    </div>
  );
}
