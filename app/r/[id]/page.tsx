import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AgentCard from "@/components/AgentCard";
import DebateCard from "@/components/DebateCard";
import DecisionCard from "@/components/DecisionCard";
import { parseDecision } from "@/lib/decision";
import { bumpViews, loadReport } from "@/lib/layered/supabase";
import CopyThreadButton from "@/components/CopyThreadButton";
import CopyLinkButton from "@/components/CopyLinkButton";
import WalletButton from "@/components/WalletButton";

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

async function getRun(id: string, bump: boolean): Promise<(RunFile & { views: number | null }) | null> {
  const dbRow = await loadReport(id);
  if (dbRow) {
    if (bump) await bumpViews(id);
    return {
      token: { name: dbRow.token.name, symbol: dbRow.token.symbol, price: dbRow.token.price, liquidity: dbRow.token.liquidity, change24h: dbRow.token.change24h },
      reports: dbRow.reports,
      debate: dbRow.debate,
      risks: dbRow.risks,
      managerPlan: "",
      decision: dbRow.decision,
      views: (dbRow.views ?? 0) + 1,
    };
  }
  const file = loadRun(id);
  return file ? { ...file, views: null } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const run = await getRun(id, false);
  if (!run) return { title: "Report not found — Aries" };
  const parsed = parseDecision(run.decision);
  return {
    title: `${run.token.symbol} ${parsed.rating ?? ""} — Aries Report`,
    description: `AI research verdict on ${run.token.name}: ${parsed.rating ?? "?"} (confidence ${parsed.confidence ?? "?"}). Not financial advice.`,
  };
}

function ratingTone(rating: string | null): string {
  const r = (rating ?? "").toLowerCase();
  if (r.includes("buy") || r.includes("overweight")) return "text-[#22c55e] border-[#22c55e]";
  if (r.includes("sell") || r.includes("underweight")) return "text-[#ef4444] border-[#ef4444]";
  return "text-zinc-200 border-zinc-500";
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await getRun(id, true);
  if (!run) notFound();
  const parsed = parseDecision(run.decision);

  return (
    <div className="min-h-full">
      <div aria-hidden="true" className="land-grid pointer-events-none fixed inset-0" />
      <div className="relative mx-auto w-full px-4 py-6">
        <header className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
          <Link href="/" className="flex cursor-pointer items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- static local webp */}
            <img src="/logo.webp" alt="Aries logo" width={30} height={30} className="rounded" />
            <span className="font-display text-sm font-bold tracking-[0.18em] text-white">ARIES</span>
          </Link>
          <span className="hidden font-mono text-[10px] tracking-[0.25em] text-zinc-600 uppercase sm:inline">/ REPORT</span>
          <div className="ml-auto flex items-center gap-2">
            <CopyLinkButton runId={id} />
            <WalletButton />
          </div>
        </header>

        <main className="mx-auto mt-6 flex w-full flex-col gap-4">
          <section aria-label="Verdict" className={`overflow-hidden rounded border bg-black ${ratingTone(parsed.rating)}`}>
            <div className="flex flex-col items-center gap-1 px-6 py-8 text-center">
              <p className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
                {run.token.name} ({run.token.symbol}) · {run.views != null ? `${run.views} ${run.views === 1 ? "read" : "reads"}` : "archived"}
              </p>
              <p className={`font-display mt-2 text-5xl font-black tracking-tight sm:text-6xl ${ratingTone(parsed.rating).split(" ")[0]}`}>
                {parsed.rating ?? "?"}
              </p>
              {parsed.confidence && (
                <p className="mt-1 font-mono text-xs tracking-widest text-zinc-400 uppercase">Confidence · {parsed.confidence}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-px border-t border-white/10 bg-white/10 font-mono text-center">
              {[
                { k: "Price", v: `$${run.token.price}` },
                { k: "Liquidity", v: `$${run.token.liquidity}` },
                { k: `24h`, v: `${run.token.change24h}%` },
              ].map((f) => (
                <div key={f.k} className="bg-black px-2 py-3">
                  <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">{f.k}</p>
                  <p className="mt-1 text-sm font-bold text-zinc-100">{f.v}</p>
                </div>
              ))}
            </div>
          </section>

          <DecisionCard markdown={run.decision} />

          <div className="flex flex-wrap gap-2">
            <CopyThreadButton
              tokenName={run.token.name}
              tokenSymbol={run.token.symbol}
              rating={parsed.rating ?? "?"}
              confidence={parsed.confidence ?? "?"}
              risks={parsed.risks}
              runId={id}
            />
            <Link
              href="/analyze"
              className="cursor-pointer rounded border border-[#22c55e] bg-[#22c55e] px-3 py-1.5 font-mono text-xs font-bold tracking-wider text-black uppercase transition-colors hover:bg-transparent hover:text-[#22c55e]"
            >
              Analyze another →
            </Link>
          </div>

          <section aria-label="Analyst reports" className="flex flex-col gap-3">
            <h2 className="font-mono text-[11px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Scout reports</h2>
            <div className="grid items-start gap-4 sm:grid-cols-2">
              {ANALYSTS.map((agent) => (
                <div key={agent} className="min-w-0">
                  <AgentCard agent={agent} status="done" tools={[]} results={[]} report={run.reports[agent] ?? null} />
                </div>
              ))}
            </div>
          </section>

          {run.reports["trader"] ? (
            <section aria-label="Trader proposal" className="flex flex-col gap-3">
              <h2 className="font-mono text-[11px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Trader proposal</h2>
              <AgentCard agent="trader" status="done" tools={[]} results={[]} report={run.reports["trader"] ?? null} />
            </section>
          ) : null}

          <section aria-label="Debate" className="flex flex-col gap-3">
            <h2 className="font-mono text-[11px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Bull vs bear · {run.debate.length} turns</h2>
            <div className="flex flex-col gap-3">
              {run.debate.map((d, i) => (
                <DebateCard key={i} phase={d.phase} round={d.round} side={d.side} text={d.text} />
              ))}
            </div>
            {run.managerPlan ? (
              <AgentCard agent="Research Manager" status="done" tools={[]} results={[]} report={run.managerPlan} />
            ) : null}
          </section>

          {run.risks ? (
            <section aria-label="Risk review" className="flex flex-col gap-3">
              <h2 className="font-mono text-[11px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Risk review</h2>
              <div className="grid items-start gap-4 sm:grid-cols-2">
                {["liquidity", "rugpath", "concentration"].map((slot) => (
                  <div key={slot} className="min-w-0">
                    <AgentCard agent={`risk:${slot}`} status="done" tools={[]} results={[]} report={run.risks?.[slot] ?? null} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </main>

        <footer className="mx-auto mt-8 w-full border-t border-white/10 pt-4 font-mono text-[11px] leading-relaxed text-zinc-500">
          <p>
            Automated research, not financial advice. Thin data on new tokens makes signals unreliable.
            Background: &ldquo;TradingAgents: Multi-Agents LLM Financial Trading Framework&rdquo; (arXiv 2412.20138).
          </p>
        </footer>
      </div>
    </div>
  );
}
