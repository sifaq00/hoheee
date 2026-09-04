import type { ChatMessage } from "@/lib/llm";
import { MISSING_REPORT_RULE, formatReports, invokeWithRetry, type ReportsBundle } from "./types";

export type RiskSide = "aggressive" | "conservative" | "neutral";

const PERSONAS: Record<RiskSide, string> = {
  aggressive:
    "You are the Aggressive Risk Analyst. Champion high-reward, high-risk opportunity: upside, " +
    "growth, first-mover edge. Directly rebut the conservative and neutral stances with data, " +
    "showing where caution misses opportunity or rests on over-conservative assumptions.",
  conservative:
    "You are the Conservative Risk Analyst. Protect capital: liquidity depth, slippage on exit, " +
    "rug and authority risk, volatility, safe sizing. Directly rebut the aggressive and neutral " +
    "stances with data, showing where optimism overlooks threats to capital.",
  neutral:
    "You are the Neutral Risk Analyst. Provide the balanced middle path: verify claims from both " +
    "sides against the data, challenge where each side is overly optimistic or overly cautious, " +
    "and argue for a moderate, sustainable adjustment to the trader plan.",
};

export async function runRiskDebater(
  side: RiskSide,
  traderPlan: string,
  reports: ReportsBundle,
  debateSoFar: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        `${PERSONAS[side]} Every turn must reference the trader plan and the layer-1 reports. ` +
        "No tools. Write in English, conversationally, debating — not just presenting data.",
    },
    {
      role: "user",
      content:
        `Trader plan:\n${traderPlan}\n\n` +
        `Layer-1 reports:\n${formatReports(reports)}\n\n` +
        `Risk debate so far:\n${debateSoFar || "(no prior turns — open with your own argument from the data)"}\n\n` +
        `${MISSING_REPORT_RULE}\n\n` +
        "Deliver your argument for this turn, responding directly to the other sides if they have spoken.",
    },
  ];
  return invokeWithRetry(messages);
}
