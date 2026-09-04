import type { ChatMessage } from "@/lib/llm";
import { MISSING_REPORT_RULE, formatReports, invokeWithRetry, type ReportsBundle } from "./types";

export async function runTrader(investmentPlan: string, reports: ReportsBundle): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a trading agent for Solana tokens. Translate the investment plan into a concrete " +
        "transaction proposal grounded in the layer-1 reports. No tools. Write in English. " +
        "End your response with 'FINAL TRANSACTION PROPOSAL: **BUY/HOLD/SELL**'.",
    },
    {
      role: "user",
      content:
        `Investment plan:\n${investmentPlan}\n\n` +
        `Layer-1 reports:\n${formatReports(reports)}\n\n` +
        `${MISSING_REPORT_RULE}\n\n` +
        "Propose: entry approach, relative sizing as % of portfolio, timing, and exit/rug scenario " +
        "(including what invalidates the trade). Be specific and decisive.",
    },
  ];
  return invokeWithRetry(messages);
}
