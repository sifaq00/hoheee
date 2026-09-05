import { runAnalyst } from "@/lib/agents/shared";
import { CHAINS, validateAddress, type ChainId } from "@/lib/chains";
import { MISSING_REPORT } from "@/lib/agents/types";
import { stripToolCallXml } from "@/lib/layered/validate";
import type { AgentEvent, TokenSummary } from "@/lib/pipeline/state";
import { getTokenSummaryFor } from "@/lib/tools/dexscreener";
import { analystToolsFor } from "@/lib/tools/index";
import { mintChain } from "./chain";
import type { L1Result } from "./types";

const ROLES = {
  onchain: "You are the onchain analyst for a Solana token. Use at most ONE tool call, then write ONE short paragraph (max 5 sentences): holder concentration, liquidity depth, mint/freeze authority, biggest onchain risk. Numbers only from tool output — never invent.",
  technical: "You are the technical analyst for a Solana token. Use at most ONE tool call, then write ONE short paragraph (max 5 sentences): price trend, momentum, liquidity venues. Numbers only from tool output — never invent.",
  sentiment: "You are the sentiment analyst for a Solana token. Use at most ONE tool call, then write ONE short paragraph (max 5 sentences): community traction and social momentum signals. Never invent engagement numbers.",
  news: "You are the news analyst for a Solana token. Use at most ONE tool call, then write ONE short paragraph (max 5 sentences): recent catalysts or headlines affecting the token. State gaps honestly.",
} as const;

const GUARD = " Output findings only: never emit <tool_call> blocks, planning notes, or meta-commentary about your next steps. Never use markdown tables (narrow cards break them); use short plain lines or bullets instead.";

type Slot = keyof typeof ROLES;

export async function runL1(chain: ChainId, mint: string, opts: { signal?: AbortSignal; emit?: (e: AgentEvent) => void } = {}): Promise<L1Result> {
  if (!validateAddress(chain, mint)) throw new Error(chain === "solana" ? "Invalid Solana mint address" : "Invalid contract address");
  let summary: TokenSummary | null;
  try {
    summary = await getTokenSummaryFor(chain, mint);
  } catch {
    throw new Error("data source unreachable");
  }
  if (!summary) throw new Error(`Token not found: ${mint}`);
  opts.emit?.({ type: "token_found", name: summary.name, symbol: summary.symbol, price: summary.priceUsd, liquidity: summary.liquidityUsd, change24h: summary.priceChange24h });
  const tools = analystToolsFor(chain);
  const slots = Object.keys(ROLES) as Slot[];
  const settled = await Promise.allSettled(
    slots.map(async (agent, i) => {
      // Stagger launches: 4 analysts hammering the model + CoinGecko at the
      // same millisecond is how rate limits happen.
      if (i > 0 && !opts.signal?.aborted) {
        await new Promise((r) => setTimeout(r, i * 1500));
      }
      // Three analyst-level attempts: transient LLM/tool hiccups are common,
      // MISSING is the last resort, not the first.
      let lastErr: unknown = new Error("empty report");
      for (let attempt = 0; attempt < 3; attempt++) {
        if (opts.signal?.aborted) break;
        try {
          const report = await runAnalyst({
            agent,
            mint,
            chain,
            summary,
            systemRole: `${ROLES[agent]} Network: ${CHAINS[chain].label}.` + GUARD,
            toolNames: tools[agent],
            cap: 1,
            maxTokens: 700,
            timeoutMs: 20000,
            signal: opts.signal,
            emit: (e) => opts.emit?.(e),
          });
          const clean = stripToolCallXml(report);
          if (clean.trim()) {
            opts.emit?.({ type: "agent_report", agent, report: clean });
            return clean;
          }
          lastErr = new Error("empty report");
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr;
    })
  );
  const reports = {} as L1Result["reports"];
  const errors: L1Result["errors"] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      reports[slots[i]] = r.value;
    } else {
      reports[slots[i]] = MISSING_REPORT;
      errors.push({ agent: slots[i], message: r.reason instanceof Error ? r.reason.message : String(r.reason) });
    }
  });
  return {
    token: { name: summary.name, price: summary.priceUsd, liquidity: summary.liquidityUsd, change24h: summary.priceChange24h },
    symbol: summary.symbol,
    reports,
    errors,
    chain: mintChain("l1", chain, mint, reports),
  };
}

