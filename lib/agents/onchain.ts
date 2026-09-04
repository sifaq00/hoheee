import { CONFIG } from "@/lib/pipeline/config";
import type { AgentEvent, TokenSummary } from "@/lib/pipeline/state";
import { runAnalyst } from "./shared";

const TOOL_NAMES = ["get_token_profile", "get_top_pools", "get_risk_report", "get_holder_distribution"];

const SYSTEM_ROLE = `You are the onchain analyst for a Solana token. Investigate holder distribution and top-wallet concentration (whale/insider share, holder count), liquidity depth, mint and freeze authority status, token age, and LP lock/burn status. Start with get_token_profile and get_risk_report, then drill into get_holder_distribution and get_top_pools for concentration and venue depth. Provide specific numbers with supporting evidence to help traders assess rug and concentration risk. If a tool returns an error or missing data, note the limitation honestly and continue with what you have — never invent numbers. State which tools you used and any data limitations explicitly. End your report with a markdown table of key findings.`;

export async function runOnchainAnalyst(
  mint: string,
  summary: TokenSummary,
  emit: (e: AgentEvent) => void
): Promise<string> {
  return runAnalyst({
    agent: "onchain",
    mint,
    summary,
    systemRole: SYSTEM_ROLE,
    toolNames: TOOL_NAMES,
    cap: CONFIG.ANALYST_TOOL_CAP.onchain,
    emit,
  });
}
