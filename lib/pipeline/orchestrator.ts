import { CONFIG } from "@/lib/pipeline/config";
import type { AgentEvent, AgentId, PipelineState, TokenSummary } from "@/lib/pipeline/state";
import { runOnchainAnalyst } from "@/lib/agents/onchain";
import { runTechnicalAnalyst } from "@/lib/agents/technical";
import { runSentimentAnalyst } from "@/lib/agents/sentiment";
import { runNewsAnalyst } from "@/lib/agents/news";
import { runBull } from "@/lib/agents/bull";
import { runBear } from "@/lib/agents/bear";
import { runResearchManager } from "@/lib/agents/research-manager";
import { runTrader } from "@/lib/agents/trader";
import { runRiskDebater, type RiskSide } from "@/lib/agents/risk-team";
import { runPortfolioManager } from "@/lib/agents/portfolio-manager";
import { MISSING_REPORT, type ReportsBundle } from "@/lib/agents/types";
import { getTokenSummary } from "@/lib/tools/dexscreener";

export const MINT_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export class TokenNotFoundError extends Error {
  constructor(mint: string) {
    super(`Token not found: ${mint}`);
    this.name = "TokenNotFoundError";
  }
}

// Cap per-report chars passed downstream so multi-round debates stay bounded.
const MAX_REPORT_CHARS = 6000;

function truncate(text: string): string {
  return text.length > MAX_REPORT_CHARS ? text.slice(0, MAX_REPORT_CHARS) + "\n[truncated]" : text;
}

function truncatedBundle(reports: ReportsBundle): ReportsBundle {
  return {
    onchain: truncate(reports.onchain),
    technical: truncate(reports.technical),
    sentiment: truncate(reports.sentiment),
    news: truncate(reports.news),
  };
}

async function fetchSummary(mint: string): Promise<TokenSummary> {
  let summary: TokenSummary | null;
  try {
    summary = await getTokenSummary(mint);
  } catch {
    throw new Error("data source unreachable");
  }
  if (!summary) throw new TokenNotFoundError(mint);
  return summary;
}

type AnalystSlot = "onchain" | "technical" | "sentiment" | "news";

async function runAnalystSlot(
  agent: AnalystSlot,
  mint: string,
  summary: TokenSummary,
  emit: (e: AgentEvent) => void,
  run: (mint: string, summary: TokenSummary, emit: (e: AgentEvent) => void) => Promise<string>
): Promise<string> {
  emit({ type: "agent_start", agent });
  try {
    const report = await run(mint, summary, emit);
    emit({ type: "agent_report", agent, report });
    return report;
  } catch (err) {
    emit({ type: "error", agent, message: err instanceof Error ? err.message : String(err) });
    return MISSING_REPORT;
  }
}

function err(emit: (e: AgentEvent) => void, agent: AgentId, unknown: unknown): void {
  emit({ type: "error", agent, message: unknown instanceof Error ? unknown.message : String(unknown) });
}

export async function runAnalysis(
  mint: string,
  emit: (event: AgentEvent) => void,
  opts: { signal?: AbortSignal } = {}
): Promise<PipelineState> {
  const signal = opts.signal;
  if (!MINT_REGEX.test(mint)) throw new Error("Invalid Solana mint address");

  const summary = await fetchSummary(mint);
  emit({
    type: "token_found",
    name: summary.name,
    price: summary.priceUsd,
    liquidity: summary.liquidityUsd,
    change24h: summary.priceChange24h,
  });

  const state: PipelineState = {
    mint,
    summary,
    reports: {},
    debateHistory: "",
    investmentPlan: "",
    traderPlan: "",
    riskDebateHistory: "",
    finalDecision: "",
  };

  // Layer 1: four analysts, parallel or sequential per config.
  const slots: { agent: AnalystSlot; run: typeof runOnchainAnalyst }[] = [
    { agent: "onchain", run: runOnchainAnalyst },
    { agent: "technical", run: runTechnicalAnalyst },
    { agent: "sentiment", run: runSentimentAnalyst },
    { agent: "news", run: runNewsAnalyst },
  ];
  if (CONFIG.PARALLEL_ANALYSTS) {
    if (!signal?.aborted) {
      const settled = await Promise.allSettled(
        slots.map((s) => runAnalystSlot(s.agent, mint, summary, emit, s.run))
      );
      settled.forEach((r, i) => {
        state.reports[slots[i].agent] = r.status === "fulfilled" ? r.value : MISSING_REPORT;
      });
    } else {
      for (const s of slots) state.reports[s.agent] = MISSING_REPORT;
    }
  } else {
    for (const s of slots) {
      if (signal?.aborted) {
        state.reports[s.agent] = MISSING_REPORT;
        continue;
      }
      state.reports[s.agent] = await runAnalystSlot(s.agent, mint, summary, emit, s.run);
    }
  }
  const reports = {
    onchain: state.reports.onchain ?? MISSING_REPORT,
    technical: state.reports.technical ?? MISSING_REPORT,
    sentiment: state.reports.sentiment ?? MISSING_REPORT,
    news: state.reports.news ?? MISSING_REPORT,
  } satisfies ReportsBundle;

  // Layer 2: bull/bear debate.
  let lastBullArg = "";
  let lastBearArg = "";
  for (let round = 1; round <= CONFIG.MAX_DEBATE_ROUNDS; round++) {
    if (signal?.aborted) break;
    try {
      const bullArg = await runBull(truncatedBundle(reports), state.debateHistory, lastBearArg);
      lastBullArg = bullArg;
      state.debateHistory += `Bull (round ${round}):\n${bullArg}\n\n`;
      emit({ type: "debate_turn", phase: "invest", round, side: "bull", text: bullArg });
    } catch (e) {
      err(emit, "bull", e);
    }
    try {
      const bearArg = await runBear(truncatedBundle(reports), state.debateHistory, lastBullArg);
      lastBearArg = bearArg;
      state.debateHistory += `Bear (round ${round}):\n${bearArg}\n\n`;
      emit({ type: "debate_turn", phase: "invest", round, side: "bear", text: bearArg });
    } catch (e) {
      err(emit, "bear", e);
    }
  }

  // Research manager synthesizes the debate into an investment plan.
  try {
    if (signal?.aborted) throw new Error("aborted");
    state.investmentPlan = await runResearchManager(truncatedBundle(reports), state.debateHistory);
    emit({
      type: "debate_turn",
      phase: "invest",
      round: CONFIG.MAX_DEBATE_ROUNDS,
      side: "research_manager",
      text: state.investmentPlan,
    });
  } catch (e) {
    err(emit, "research_manager", e);
  }

  // Trader turns the plan into a concrete proposal.
  try {
    if (signal?.aborted) throw new Error("aborted");
    state.traderPlan = await runTrader(state.investmentPlan, truncatedBundle(reports));
    emit({ type: "agent_report", agent: "trader", report: state.traderPlan });
  } catch (e) {
    err(emit, "trader", e);
  }

  // Layer 3: risk debate, aggressive -> conservative -> neutral per round.
  const sides: RiskSide[] = ["aggressive", "conservative", "neutral"];
  for (let round = 1; round <= CONFIG.MAX_RISK_ROUNDS; round++) {
    if (signal?.aborted) break;
    for (const side of sides) {
      try {
        const arg = await runRiskDebater(
          side,
          state.traderPlan,
          truncatedBundle(reports),
          state.riskDebateHistory
        );
        state.riskDebateHistory += `${side} (round ${round}):\n${arg}\n\n`;
        emit({ type: "debate_turn", phase: "risk", round, side, text: arg });
      } catch (e) {
        err(emit, side, e);
      }
    }
  }

  // Portfolio manager makes the final decision; its failure is terminal.
  try {
    if (signal?.aborted) throw new Error("aborted");
    state.finalDecision = await runPortfolioManager(
      truncatedBundle(reports),
      state.investmentPlan,
      state.traderPlan,
      state.riskDebateHistory
    );
    emit({ type: "decision", markdown: state.finalDecision });
  } catch (e) {
    err(emit, "portfolio_manager", e);
  }

  return state;
}
