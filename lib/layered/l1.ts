import { runAnalyst } from "@/lib/agents/shared";
import { MISSING_REPORT } from "@/lib/agents/types";
import { MINT_REGEX, stripToolCallXml } from "@/lib/layered/validate";
import type { AgentEvent, TokenSummary } from "@/lib/pipeline/state";
import { getTokenSummary } from "@/lib/tools/dexscreener";
import { ANALYST_TOOLS } from "@/lib/tools/index";
import { mintChain } from "./chain";
import type { L1Result } from "./types";

const ROLES = {
  onchain: "You are the onchain analyst for a Solana token. Use at most ONE tool call, then write ONE short paragraph (max 5 sentences): holder concentration, liquidity depth, mint/freeze authority, biggest onchain risk. Numbers only from tool output — never invent.",
  technical: "You are the technical analyst for a Solana token. Use at most ONE tool call, then write ONE short paragraph (max 5 sentences): price trend, momentum, liquidity venues. Numbers only from tool output — never invent.",
  sentiment: "You are the sentiment analyst for a Solana token. Use at most ONE tool call, then write ONE short paragraph (max 5 sentences): community traction and social momentum signals. Never invent engagement numbers.",
  news: "You are the news analyst for a Solana token. Use at most ONE tool call, then write ONE short paragraph (max 5 sentences): recent catalysts or headlines affecting the token. State gaps honestly.",
} as const;

const GUARD = " Output findings only: never emit <tool_call> blocks, planning notes, or meta-commentary about your next steps.";

type Slot = keyof typeof ROLES;

export async function runL1(mint: string, opts: { signal?: AbortSignal; emit?: (e: AgentEvent) => void } = {}): Promise<L1Result> {
  if (!MINT_REGEX.test(mint)) throw new Error("Invalid Solana mint address");
  let summary: TokenSummary | null;
  try {
    summary = await getTokenSummary(mint);
  } catch {
    throw new Error("data source unreachable");
  }
  if (!summary) throw new Error(`Token not found: ${mint}`);
  opts.emit?.({ type: "token_found", name: summary.name, symbol: summary.symbol, price: summary.priceUsd, liquidity: summary.liquidityUsd, change24h: summary.priceChange24h });
  const slots = Object.keys(ROLES) as Slot[];
  const settled = await Promise.allSettled(
    slots.map(async (agent) => {
      const report = await runAnalyst({
        agent,
        mint,
        summary,
        systemRole: ROLES[agent] + GUARD,
        toolNames: ANALYST_TOOLS[agent],
        cap: 1,
        maxTokens: 700,
        timeoutMs: 12000,
        signal: opts.signal,
        emit: (e) => opts.emit?.(e),
      });
      const clean = stripToolCallXml(report);
      opts.emit?.({ type: "agent_report", agent, report: clean });
      return clean;
    })
  );
  const reports = {} as L1Result["reports"];
  const errors: L1Result["errors"] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value.trim()) {
      reports[slots[i]] = r.value;
    } else {
      reports[slots[i]] = MISSING_REPORT;
      const msg = r.status === "rejected" ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : "empty report";
      errors.push({ agent: slots[i], message: msg });
    }
  });
  return {
    token: { name: summary.name, price: summary.priceUsd, liquidity: summary.liquidityUsd, change24h: summary.priceChange24h },
    symbol: summary.symbol,
    reports,
    errors,
    chain: mintChain("l1", mint, reports),
  };
}

