import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import TokenCard from "@/components/TokenCard";
import AgentCard from "@/components/AgentCard";
import DebateCard from "@/components/DebateCard";
import DecisionCard from "@/components/DecisionCard";
import { parseDecision } from "@/lib/decision";
import { bumpViews, loadReport } from "@/lib/layered/supabase";
import CopyThreadButton from "@/components/CopyThreadButton";

export const dynamicParams = true;

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
  risks?: Record<string, string>;
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
  const dbRow = await loadReport(id);
  if (dbRow) await bumpViews(id);
  const views = dbRow?.views != null ? dbRow.views + 1 : null;
  const run = dbRow
    ? {
        token: { name: dbRow.token.name, symbol: dbRow.token.symbol, price: dbRow.token.price, liquidity: dbRow.token.liquidity, change24h: dbRow.token.change24h },
        reports: dbRow.reports,
        debate: dbRow.debate,
        risks: dbRow.risks,
        managerPlan: "",
        decision: dbRow.decision,
      }
    : loadRun(id);
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
            Research tool, not financial advice. Analysis takes a few minutes.
            {views != null && <> · {views} {views === 1 ? "read" : "reads"}</>}
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
              tools={[]}
              results={[]}
              report={run.reports[agent] ?? null}
            />
          ))}
        </section>

        {run.reports["trader"] ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Trader proposal</h2>
            <AgentCard
              agent="trader"
              status="done"
              tools={[]}
              results={[]}
              report={run.reports["trader"] ?? null}
            />
          </section>
        ) : null}

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
          {run.managerPlan ? (
            <AgentCard
              agent="Research Manager"
              status="done"
              tools={[]}
              results={[]}
              report={run.managerPlan}
            />
          ) : null}
        </section>

        {run.risks ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Risk review</h2>
            {["liquidity", "rugpath", "concentration"].map((slot) => (
              <AgentCard
                key={slot}
                agent={`risk:${slot}`}
                status="done"
                tools={[]}
                results={[]}
                report={run.risks?.[slot] ?? null}
              />
            ))}
          </section>
        ) : null}
      </main>
      <footer className="mt-6 w-full max-w-2xl border-t border-zinc-800 pt-4 text-xs leading-relaxed text-zinc-500">
        <p>
          Each analysis takes under a minute: mini analysts plus one debate
          round. New tokens have thin data — low liquidity and short history
          make signals unreliable. This system can be wrong: output is
          automated research, not financial advice.
        </p>
          <p className="mt-2">
            Research background: &ldquo;TradingAgents: Multi-Agents LLM
            Financial Trading Framework&rdquo; (arXiv 2412.20138).
          </p>
      </footer>
    </div>
  );
}
