import type { ChatMessage } from "@/lib/llm";
import { MISSING_REPORT_RULE, formatReports, invokeWithRetry, type ReportsBundle } from "./types";

export async function runResearchManager(
  reports: ReportsBundle,
  debateHistory: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are the Research Manager: debate evaluator and facilitator for a Solana token. " +
        "Critically weigh the bull vs bear debate against the layer-1 reports. " +
        "No tools. Write in English.",
    },
    {
      role: "user",
      content:
        `Layer-1 reports:\n${formatReports(reports)}\n\n` +
        `Debate history:\n${debateHistory || "(no debate held)"}\n\n` +
        `${MISSING_REPORT_RULE}\n\n` +
        "Decide exactly one rating: Buy, Overweight, Hold, Underweight, or Sell. " +
        "Summarize the strongest points from both sides, then commit to a stance grounded in the " +
        "strongest evidence. Do NOT default to Hold because both sides have valid points — " +
        "choose Hold only if strongly justified. Then produce an investment plan with: " +
        "(1) Recommendation, (2) Rationale, (3) Strategic Actions (concrete next steps for the trader).",
    },
  ];
  return invokeWithRetry(messages);
}
