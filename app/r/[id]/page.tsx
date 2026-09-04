import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import TokenCard from "@/components/TokenCard";
import AgentCard from "@/components/AgentCard";
import DebateCard from "@/components/DebateCard";
import DecisionCard from "@/components/DecisionCard";
import { parseDecision } from "@/lib/decision";
import CopyThreadButton from "@/components/CopyThreadButton";

export const dynamicParams = false;

interface RunFile {
  token: {
    name: string;
    symbol: string;
    price: number;
    liquidity: number;
    change24h: number;
  };
  reports: Record<string, string>;
  debate: { phase: string; round: number; side: string; text: string }[];
  managerPlan: string;
  decision: string;
}

const ANALYSTS = ["onchain", "technical", "sentiment", "news"];

function runsDir(): string {
  return path.join(process.cwd(), "runs");
}

export function generateStaticParams(): { id: string }[] {
  const dir = runsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ id: path.basename(f, ".json") }));
}

function loadRun(id: string): RunFile | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(runsDir(), `${id}.json`), "utf8")
    ) as RunFile;
  } catch {
    return null;
  }
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = loadRun(id);
  if (!run) notFound();
  const parsed = parseDecision(run.decision);

  return (
    <div className="min-h-full flex flex-col items-center px-4 py-10">
      <main className="w-full max-w-2xl flex flex-col gap-6">
        <header className="flex flex-col gap-2 border-b border-zinc-800 pb-4">
          <h1 className="text-xl font-bold tracking-tight">
            Hoheee <span className="text-[#22c55e]">—</span> Solana Token
            Research
          </h1>
          <p className="text-sm text-zinc-400">
            Research tool, not financial advice. Analysis takes 5-15 minutes.
          </p>
        </header>

        <TokenCard
          name={run.token.name}
          symbol={run.token.symbol}
          price={String(run.token.price)}
          liquidity={run.token.liquidity}
          change24h={run.token.change24h}
        />

        <DecisionCard markdown={run.decision} />

        <CopyThreadButton
          tokenName={run.token.name}
          tokenSymbol={run.token.symbol}
          rating={parsed.rating ?? "?"}
          confidence={parsed.confidence ?? "?"}
          risks={parsed.risks}
          runId={id}
        />

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">Analyst reports</h2>
          {ANALYSTS.map((agent) => (
            <AgentCard
              key={agent}
              agent={agent}
              status="done"
              reasoning=""
              tools={[]}
              report={run.reports[agent] ?? null}
            />
          ))}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">Trader proposal</h2>
          <AgentCard
            agent="trader"
            status="done"
            reasoning=""
            tools={[]}
            report={run.reports["trader"] ?? null}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">Debate</h2>
          {run.debate.map((d, i) => (
            <DebateCard
              key={i}
              phase={d.phase}
              round={d.round}
              side={d.side}
              text={d.text}
            />
          ))}
          <AgentCard
            agent="Research Manager"
            status="done"
            reasoning=""
            tools={[]}
            report={run.managerPlan}
          />
        </section>
      </main>
      <footer className="mt-6 w-full max-w-2xl border-t border-zinc-800 pt-4 text-xs leading-relaxed text-zinc-500">
        <p>
          Each analysis takes about 13-20 minutes and consumes significant
          reasoning-model tokens across analysts, debates, and risk review.
          New tokens have thin data — low liquidity and short history make
          signals unreliable. This system can be wrong: output is automated
          research, not financial advice.
        </p>
        <p className="mt-2">
          Built on research from Bullseye / TradingAgents (arXiv 2412.20138,
          Apache 2.0).
        </p>
      </footer>
    </div>
  );
}
