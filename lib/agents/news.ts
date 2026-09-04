import { CONFIG } from "@/lib/pipeline/config";
import type { AgentEvent, TokenSummary } from "@/lib/pipeline/state";
import { runAnalyst } from "./shared";

const TOOL_NAMES = ["get_coin_metadata", "get_token_profile"];

const SYSTEM_ROLE = `You are the news and project analyst for a Solana token. Research listing status (CoinGecko categories and markets), project description and narrative, token age, and market momentum. Call get_coin_metadata at most once — CoinGecko public tier rate-limits — and complement with get_token_profile for current market context. Provide specific, actionable insights with supporting evidence to help traders understand what this project is and where it stands. If a tool returns an error or missing data, note the limitation honestly and continue with what you have — never invent numbers. State which tools you used and any data limitations explicitly. End your report with a markdown table of key findings.`;

export async function runNewsAnalyst(
  mint: string,
  summary: TokenSummary,
  emit: (e: AgentEvent) => void
): Promise<string> {
  return runAnalyst({
    agent: "news",
    mint,
    summary,
    systemRole: SYSTEM_ROLE,
    toolNames: TOOL_NAMES,
    cap: CONFIG.ANALYST_TOOL_CAP.news,
    emit,
  });
}
