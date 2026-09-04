import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MINT_REGEX, runAnalysis } from "@/lib/pipeline/orchestrator";
import { MISSING_REPORT } from "@/lib/agents/types";
import { isRunId, newRunId } from "@/lib/progress/ids";
import type { AgentEvent } from "@/lib/pipeline/state";

const USAGE = "Usage: tsx scripts/generate-report.ts <mint> [runId]\n  mint: Solana base58 address, 32-44 chars\n  runId: optional uuid (auto-generated when empty)";

interface DebateTurn {
  phase: string;
  round: number;
  side: string;
  text: string;
}

function logProgress(e: AgentEvent): void {
  switch (e.type) {
    case "agent_start":
      console.log(`[start] ${e.agent}`);
      break;
    case "agent_report":
      console.log(`[report] ${e.agent} (${e.report.length} chars)`);
      break;
    case "debate_turn":
      console.log(`[debate] ${e.phase} r${e.round} ${e.side} (${e.text.length} chars)`);
      break;
    case "decision":
      console.log(`[decision] (${e.markdown.length} chars)`);
      break;
    case "error":
      console.error(`[error] ${e.agent}: ${e.message}`);
      break;
    default:
      break;
  }
}

async function main(): Promise<number> {
  const mint = process.argv[2];
  if (!mint || !MINT_REGEX.test(mint)) {
    console.error(USAGE);
    return 2;
  }

  const rawRunId = process.argv[3];
  const runId = rawRunId ? (isRunId(rawRunId) ? rawRunId : null) : newRunId();
  if (!runId) { console.error(USAGE); return 2; }
  const model = process.env.LLM_MODEL ?? "unknown";
  const createdAt = new Date().toISOString();
  const started = Date.now();
  console.log(`[run] ${runId} mint=${mint} model=${model}`);

  const reports: Record<string, string> = {};
  const debate: DebateTurn[] = [];
  let managerPlan = "";
  let decision = "";
  let token = { name: "", symbol: "", price: 0, liquidity: 0, change24h: 0 };

  try {
    const emitWithProgress = (e: AgentEvent) => {
      logProgress(e);
      if (e.type === "token_found") {
        token = {
          name: e.name,
          symbol: token.symbol,
          price: Number(e.price) || 0,
          liquidity: e.liquidity,
          change24h: e.change24h,
        };
      } else if (e.type === "agent_report") {
        reports[e.agent] = e.report;
      } else if (e.type === "debate_turn") {
        if (e.side === "research_manager") managerPlan = e.text;
        else debate.push({ phase: e.phase, round: e.round, side: e.side, text: e.text });
      } else if (e.type === "decision") {
        decision = e.markdown;
      }
    };
    const state = await runAnalysis(mint, emitWithProgress);

    // Fill honest gaps: failed analysts emit error without agent_report.
    for (const slot of ["onchain", "technical", "sentiment", "news"] as const) {
      reports[slot] = reports[slot] ?? state.reports[slot] ?? MISSING_REPORT;
    }
    reports.trader = reports.trader || state.traderPlan || MISSING_REPORT;
    managerPlan = managerPlan || state.investmentPlan || MISSING_REPORT;
    decision = decision || state.finalDecision;
    token.symbol = state.summary.symbol ?? "";
    if (!token.name) {
      token = {
        name: state.summary.name,
        symbol: state.summary.symbol,
        price: Number(state.summary.priceUsd) || 0,
        liquidity: state.summary.liquidityUsd,
        change24h: state.summary.priceChange24h,
      };
    }
  } catch (err) {
    console.error(`[fatal] ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  if (!decision.trim()) {
    console.error("[fatal] empty decision");
    return 1;
  }

  const output = {
    runId,
    mint,
    model,
    createdAt,
    durationMs: Date.now() - started,
    token,
    reports: {
      onchain: reports.onchain,
      technical: reports.technical,
      sentiment: reports.sentiment,
      news: reports.news,
      trader: reports.trader,
    },
    debate,
    managerPlan,
    decision,
  };

  await mkdir("runs", { recursive: true });
  const rel = path.join("runs", `${runId}.json`);
  const body = JSON.stringify(output, null, 2);
  await writeFile(rel, body);
  const abs = path.resolve(rel);
  console.log(`[wrote] ${abs} (${Buffer.byteLength(body)} bytes)`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[fatal] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
);
