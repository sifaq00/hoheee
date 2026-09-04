import type { ChatMessage } from "@/lib/llm";
import { MISSING_REPORT_RULE, formatReports, invokeWithRetry, type ReportsBundle } from "./types";

export async function runBull(
  reports: ReportsBundle,
  debateSoFar: string,
  lastBearArg: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a Bull Analyst advocating for investing in a Solana token. " +
        "Build a strong, evidence-based case: growth potential, momentum, community traction, " +
        "liquidity depth, and positive catalysts. Cite only the layer-1 reports provided. " +
        "No tools. No empty claims — every claim needs data from a report. " +
        "Write in English.",
    },
    {
      role: "user",
      content:
        `Layer-1 reports:\n${formatReports(reports)}\n\n` +
        `Debate so far:\n${debateSoFar || "(no prior turns)"}\n\n` +
        `Last bear argument:\n${lastBearArg || "(none yet — open with your strongest case)"}\n\n` +
        `${MISSING_REPORT_RULE}\n\n` +
        "Deliver a compelling bull argument. You MUST directly rebut the last bear argument " +
        "with specific data from the reports. Engage conversationally with the bear analyst, " +
        "do not just list data.",
    },
  ];
  return invokeWithRetry(messages);
}
