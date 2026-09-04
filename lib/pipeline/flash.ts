import type { ChatMessage } from "@/lib/llm";
import { runAnalyst } from "@/lib/agents/shared";
import { TOOL_NAMES as ONCHAIN_TOOLS } from "@/lib/agents/onchain";
import { TOOL_NAMES as TECHNICAL_TOOLS } from "@/lib/agents/technical";
import { TOOL_NAMES as SENTIMENT_TOOLS } from "@/lib/agents/sentiment";
import { TOOL_NAMES as NEWS_TOOLS } from "@/lib/agents/news";
import {
  MISSING_REPORT,
  MISSING_REPORT_RULE,
  formatReports,
  invokeWithRetry,
  type ReportsBundle,
} from "@/lib/agents/types";
import { MINT_REGEX } from "@/lib/pipeline/orchestrator";
import type { AgentEvent, AgentId, PipelineState, TokenSummary } from "@/lib/pipeline/state";
import { getTokenSummary } from "@/lib/tools/dexscreener";

const ONCHAIN_ROLE =
  "You are the onchain analyst for a Solana token. Use at most ONE tool call, then write ONE short paragraph (max 5 sentences): holder concentration, liquidity depth, mint/freeze authority, biggest onchain risk. Numbers only from tool output — never invent.";
const TECHNICAL_ROLE =
  "You are the technical analyst for a Solana token. Use at most ONE tool call, then write ONE short paragraph (max 5 sentences): price trend, momentum, liquidity venues. Numbers only from tool output — never invent.";
const SENTIMENT_ROLE =
  "You are the sentiment analyst for a Solana token. Use at most ONE tool call, then write ONE short paragraph (max 5 sentences): community traction and social momentum signals. Never invent engagement numbers.";
const NEWS_ROLE =
  "You are the news analyst for a Solana token. Use at most ONE tool call, then write ONE short paragraph (max 5 sentences): recent catalysts or headlines affecting the token. No tools beyond the one call; state gaps honestly.";

const BULL_SYSTEM =
  "You are a Bull Analyst for a Solana token. Argue FOR investing in max 150 words, citing only the mini-reports. No tools. English.";
const BEAR_SYSTEM =
  "You are a Bear Analyst for a Solana token. Argue AGAINST investing in max 150 words, citing only the mini-reports. No tools. English.";
const DECIDER_SYSTEM =
  "You are the Portfolio Manager. Decide fast from mini-reports and one debate round. No tools. English.";

const DECIDER_STRUCTURE =
  "Your output MUST be machine-parseable with this exact structure:\n" +
  "RATING: <exactly one of Buy, Overweight, Hold, Underweight, Sell>\n" +
  "CONFIDENCE: <exactly one of Low, Medium, High>\n" +
  "KEY RISKS:\n" +
  "- <bullet per risk>\n" +
  "EXECUTIVE SUMMARY\n" +
  "<concise action plan>\n" +
  "INVESTMENT THESIS\n" +
  "<concise reasoning>";

type AnalystSlot = "onchain" | "technical" | "sentiment" | "news";

async function runFlashSlot(
  agent: AnalystSlot,
  mint: string,
  summary: TokenSummary,
  systemRole: string,
  toolNames: string[],
  emit: (e: AgentEvent) => void,
  signal?: AbortSignal
): Promise<string> {
  emit({ type: "agent_start", agent });
  if (signal?.aborted) return MISSING_REPORT;
  try {
    const report = await runAnalyst({
      agent,
      mint,
      summary,
      systemRole,
      toolNames,
      cap: 1,
      maxTokens: 400,
      timeoutMs: 12000,
      signal,
      emit,
    });
    emit({ type: "agent_report", agent, report });
    return report;
  } catch (err) {
    if (!signal?.aborted) emit({ type: "error", agent, message: err instanceof Error ? err.message : String(err) });
    return MISSING_REPORT;
  }
}

function err(emit: (e: AgentEvent) => void, agent: AgentId, unknown: unknown): void {
  emit({ type: "error", agent, message: unknown instanceof Error ? unknown.message : String(unknown) });
}

export async function runFlashAnalysis(
  mint: string,
  emit: (e: AgentEvent) => void,
  opts: { signal?: AbortSignal } = {}
): Promise<PipelineState> {
  const signal = opts.signal;
  if (!MINT_REGEX.test(mint)) throw new Error("Invalid Solana mint address");

  let summary: TokenSummary | null;
  try {
    summary = await getTokenSummary(mint);
  } catch {
    throw new Error("data source unreachable");
  }
  if (!summary) throw new Error(`Token not found: ${mint}`);

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

  const slots: { agent: AnalystSlot; role: string; tools: string[] }[] = [
    { agent: "onchain", role: ONCHAIN_ROLE, tools: ONCHAIN_TOOLS },
    { agent: "technical", role: TECHNICAL_ROLE, tools: TECHNICAL_TOOLS },
    { agent: "sentiment", role: SENTIMENT_ROLE, tools: SENTIMENT_TOOLS },
    { agent: "news", role: NEWS_ROLE, tools: NEWS_TOOLS },
  ];
  const settled = await Promise.allSettled(
    slots.map((s) => runFlashSlot(s.agent, mint, summary, s.role, s.tools, emit, signal))
  );
  settled.forEach((r, i) => {
    state.reports[slots[i].agent] = r.status === "fulfilled" ? r.value : MISSING_REPORT;
  });
  const reports = {
    onchain: state.reports.onchain ?? MISSING_REPORT,
    technical: state.reports.technical ?? MISSING_REPORT,
    sentiment: state.reports.sentiment ?? MISSING_REPORT,
    news: state.reports.news ?? MISSING_REPORT,
  } satisfies ReportsBundle;

  let bullArg = "";
  if (!signal?.aborted) try {
    const msgs: ChatMessage[] = [
      { role: "system", content: BULL_SYSTEM },
      {
        role: "user",
        content:
          `Mini-reports:\n${formatReports(reports)}\n\n` +
          `Last bear argument:\n(none yet)\n\n` +
          `${MISSING_REPORT_RULE}\n\n` +
          "Rebut the bear case directly or open with your strongest case.",
      },
    ];
    bullArg = await invokeWithRetry(msgs, { maxTokens: 300, timeoutMs: 12000, signal });
    state.debateHistory += `Bull (round 1):\n${bullArg}\n\n`;
    emit({ type: "debate_turn", phase: "invest", round: 1, side: "bull", text: bullArg });
  } catch (e) {
    if (!signal?.aborted) err(emit, "bull", e);
  }

  let bearArg = "";
  if (!signal?.aborted) try {
    const msgs: ChatMessage[] = [
      { role: "system", content: BEAR_SYSTEM },
      {
        role: "user",
        content:
          `Mini-reports:\n${formatReports(reports)}\n\n` +
          `Bull argument:\n${bullArg || "(none yet)"}\n\n` +
          `${MISSING_REPORT_RULE}\n\n` +
          "Rebut the bull case directly or open with your strongest case.",
      },
    ];
    bearArg = await invokeWithRetry(msgs, { maxTokens: 300, timeoutMs: 12000, signal });
    state.debateHistory += `Bear (round 1):\n${bearArg}\n\n`;
    emit({ type: "debate_turn", phase: "invest", round: 1, side: "bear", text: bearArg });
  } catch (e) {
    if (!signal?.aborted) err(emit, "bear", e);
  }

  if (!signal?.aborted) try {
    const msgs: ChatMessage[] = [
      { role: "system", content: DECIDER_SYSTEM },
      {
        role: "user",
        content:
          `Mini-reports:\n${formatReports(reports)}\n\n` +
          `Debate transcript:\n${state.debateHistory || "(no debate held)"}\n\n` +
          `${MISSING_REPORT_RULE}\n\n` +
          DECIDER_STRUCTURE,
      },
    ];
    state.finalDecision = await invokeWithRetry(msgs, { maxTokens: 800, timeoutMs: 15000, signal });
    emit({ type: "decision", markdown: state.finalDecision });
  } catch (e) {
    if (!signal?.aborted) err(emit, "portfolio_manager", e);
  }

  return state;
}
