import TokenCard from "@/components/TokenCard";
import AgentCard from "@/components/AgentCard";
import type { L1Result } from "@/lib/layered/types";

const ORDER: (keyof L1Result["reports"])[] = ["onchain", "technical", "sentiment", "news"];

export default function AnalystsSection({
  token,
  symbol,
  reports,
}: {
  token: L1Result["token"];
  symbol: string;
  reports: Partial<L1Result["reports"]>;
}) {
  const done = ORDER.filter((k) => reports[k]).length;
  return (
    <div className="flex flex-col gap-3" aria-label="Analyst reports" aria-live="off">
      <TokenCard name={token.name} symbol={symbol} price={token.price} liquidity={token.liquidity} change24h={token.change24h} />
      <div className="grid items-start gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {ORDER.map((key) =>
          reports[key] ? (
            <div key={key} className="min-w-0">
              <AgentCard agent={key} status="done" tools={[]} results={[]} report={reports[key] ?? null} />
            </div>
          ) : (
            <div key={key} aria-label={`${key} running`} className="min-w-0 animate-pulse rounded border border-zinc-800 bg-zinc-950 p-4">
              <p className="font-mono text-xs font-bold tracking-wider text-zinc-500 uppercase">{key}</p>
              <p className="mt-2 font-mono text-xs text-[#22c55e]">scouting…</p>
            </div>
          )
        )}
      </div>
      <p className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase">{done}/4 scouts in</p>
    </div>
  );
}
