import { invokeLLM, type ChatMessage } from "@/lib/llm";
import {
  MISSING_REPORT_RULE,
  formatReports,
  invokeWithRetry,
  type ReportsBundle,
} from "./types";

const STRUCTURE_RULE =
  "Your output MUST be machine-parseable with this exact structure:\n" +
  "RATING: <exactly one of Buy, Overweight, Hold, Underweight, Sell>\n" +
  "CONFIDENCE: <exactly one of Low, Medium, High>\n" +
  "KEY RISKS:\n" +
  "- <bullet per risk>\n" +
  "EXECUTIVE SUMMARY\n" +
  "<concise action plan: entry, sizing, key risk levels, horizon>\n" +
  "INVESTMENT THESIS\n" +
  "<detailed reasoning anchored in the debates and reports>";

export async function runPortfolioManager(
  reports: ReportsBundle,
  investmentPlan: string,
  traderPlan: string,
  riskDebateHistory: string
): Promise<string> {
  const build = (repair: boolean): ChatMessage[] => [
    {
      role: "system",
      content:
        "You are the Portfolio Manager. Synthesize the risk debate into the final trading decision " +
        "for a Solana token. Be decisive, ground every conclusion in specific evidence. " +
        "No tools. Write in English.",
    },
    {
      role: "user",
      content:
        (repair
          ? "Your previous answer missed the required RATING:/CONFIDENCE: headers. " +
            "Rewrite it with the exact structure below, keeping the same decision.\n\n"
          : "") +
        `Investment plan:\n${investmentPlan}\n\n` +
        `Trader plan:\n${traderPlan}\n\n` +
        `Risk debate history:\n${riskDebateHistory || "(no risk debate held)"}\n\n` +
        `Layer-1 reports:\n${formatReports(reports)}\n\n` +
        `${MISSING_REPORT_RULE}\n\n` +
        STRUCTURE_RULE,
    },
  ];
  const first = await invokeWithRetry(build(false));
  if (first.includes("RATING:")) return first;
  try {
    const repaired = await invokeLLM(build(true));
    return repaired.content;
  } catch {
    return first;
  }
}
