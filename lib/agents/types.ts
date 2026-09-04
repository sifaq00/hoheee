import { invokeLLM, type ChatMessage } from "@/lib/llm";

export type ReportsBundle = Record<"onchain" | "technical" | "sentiment" | "news", string>;

export const MISSING_REPORT = "REPORT UNAVAILABLE (agent failed)";

export function formatReports(reports: ReportsBundle): string {
  return (
    `Onchain report:\n${reports.onchain}\n\n` +
    `Technical report:\n${reports.technical}\n\n` +
    `Sentiment report:\n${reports.sentiment}\n\n` +
    `News report:\n${reports.news}`
  );
}

export const MISSING_REPORT_RULE =
  `Some reports may contain the literal string "${MISSING_REPORT}". ` +
  `Proceed with the reports you have, state the gap explicitly, ` +
  `and never invent data for a missing report.`;

// Shared retry: one internal re-call on throw, then throw to caller.
export async function invokeWithRetry(messages: ChatMessage[]): Promise<string> {
  try {
    const res = await invokeLLM(messages);
    return res.content;
  } catch {
    const res = await invokeLLM(messages);
    return res.content;
  }
}
