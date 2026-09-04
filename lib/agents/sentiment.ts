import { CONFIG } from "@/lib/pipeline/config";
import type { AgentEvent, TokenSummary } from "@/lib/pipeline/state";
import { runAnalyst } from "./shared";

export const TOOL_NAMES = ["get_token_profile", "get_coin_metadata"];

const SYSTEM_ROLE = `You are the sentiment analyst for a Solana token. Assess hype versus organic interest: CoinGecko community votes and sentiment, watchlist count, categories, plus volume-to-transaction ratios from get_token_profile as an activity proxy. Important: no direct social media API — proxy data only, so state this clearly and do not claim to have read social posts. Call get_coin_metadata at most once — CoinGecko public tier rate-limits — and complement with get_token_profile. Provide specific numbers with supporting evidence to help traders judge whether attention looks hype-driven or organic. If a tool returns an error or missing data, note the limitation honestly and continue with what you have — never invent numbers. State which tools you used and any data limitations explicitly. End your report with a markdown table of key findings.`;

export async function runSentimentAnalyst(
  mint: string,
  summary: TokenSummary,
  emit: (e: AgentEvent) => void
): Promise<string> {
  return runAnalyst({
    agent: "sentiment",
    mint,
    summary,
    systemRole: SYSTEM_ROLE,
    toolNames: TOOL_NAMES,
    cap: CONFIG.ANALYST_TOOL_CAP.sentiment,
    emit,
  });
}
