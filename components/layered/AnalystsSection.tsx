import TokenCard from "@/components/TokenCard";
import AgentCard from "@/components/AgentCard";
import type { L1Result } from "@/lib/layered/types";

const ORDER: (keyof L1Result["reports"])[] = ["onchain", "technical", "sentiment", "news"];

export default function AnalystsSection({ token, symbol, reports }: { token: L1Result["token"]; symbol: string; reports: L1Result["reports"] }) {
  return (
    <section className="flex flex-col gap-3" aria-label="Analyst reports">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">L1 — Analysts (4/4)</h2>
      <TokenCard name={token.name} symbol={symbol} price={token.price} liquidity={token.liquidity} change24h={token.change24h} />
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ORDER.map((key) => (
          <div key={key} className="min-w-0">
            <AgentCard agent={key} status="done" tools={[]} results={[]} report={reports[key]} />
          </div>
        ))}
      </div>
    </section>
  );
}
