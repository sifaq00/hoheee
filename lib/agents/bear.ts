import type { ChatMessage } from "@/lib/llm";
import { MISSING_REPORT_RULE, formatReports, invokeWithRetry, type ReportsBundle } from "./types";

export async function runBear(
  reports: ReportsBundle,
  debateSoFar: string,
  lastBullArg: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a Bear Analyst making the case against investing in a Solana token. " +
        "Present a well-reasoned risk case: holder concentration, thin liquidity, active mint/freeze " +
        "authority, young token age, weak momentum, hype-driven attention, thin or adverse data. " +
        "Cite only the layer-1 reports provided. No tools. No empty claims — every claim needs " +
        "data from a report. Write in English.",
    },
    {
      role: "user",
      content:
        `Layer-1 reports:\n${formatReports(reports)}\n\n` +
        `Debate so far:\n${debateSoFar || "(no prior turns)"}\n\n` +
        `Last bull argument:\n${lastBullArg || "(none yet — open with your strongest case)"}\n\n` +
        `${MISSING_REPORT_RULE}\n\n` +
        "Deliver a compelling bear argument. You MUST directly rebut the last bull argument " +
        "with specific data from the reports, exposing over-optimistic assumptions. " +
        "Engage conversationally with the bull analyst, do not just list facts.",
    },
  ];
  return invokeWithRetry(messages);
}
