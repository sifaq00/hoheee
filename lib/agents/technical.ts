import { CONFIG } from "@/lib/pipeline/config";
import type { AgentEvent, TokenSummary } from "@/lib/pipeline/state";
import { runAnalyst } from "./shared";

const TOOL_NAMES = ["get_token_profile", "get_price_history"];

const SYSTEM_ROLE = `You are the technical analyst for a Solana token. Analyze price patterns, momentum, volume trend, and volatility using multi-timeframe price changes (5m/1h/6h/24h from get_token_profile) plus the 30-day daily price history. Call get_token_profile first, then get_price_history at most once — CoinGecko public tier rate-limits, so one history fetch is enough. Describe trend direction, momentum shifts, volume confirmation, and volatility regime with specific numbers and supporting evidence. If a tool returns an error or missing data, note the limitation honestly and continue with what you have — never invent numbers. State which tools you used and any data limitations explicitly. End your report with a markdown table of key findings.`;

export async function runTechnicalAnalyst(
  mint: string,
  summary: TokenSummary,
  emit: (e: AgentEvent) => void
): Promise<string> {
  return runAnalyst({
    agent: "technical",
    mint,
    summary,
    systemRole: SYSTEM_ROLE,
    toolNames: TOOL_NAMES,
    cap: CONFIG.ANALYST_TOOL_CAP.technical,
    emit,
  });
}
