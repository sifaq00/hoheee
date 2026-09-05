import { MISSING_REPORT, MISSING_REPORT_RULE, formatReports, invokeWithRetry, type ReportsBundle } from "@/lib/agents/types";
import type { ChainId } from "@/lib/chains";
import { CHAINS, validateAddress } from "@/lib/chains";
import type { ChatMessage } from "@/lib/llm";
import { RISK_SLOTS, type DebateTurn, type L3Result, type RiskSlot } from "./types";
import { mintChain, verifyChain } from "./chain";

const RISK_SYSTEM: Record<RiskSlot, string> = {
  liquidity: "You are the liquidity-risk reviewer for a crypto token. In max 120 words: how thin is liquidity, expected slippage on exit, pool concentration. Cite mini-reports and debate only. No tools. English.",
  rugpath: "You are the rug-path reviewer for a crypto token. In max 120 words: authority/ownership status, named risk flags, unclosed rug paths. Cite mini-reports and debate only. No tools. English.",
  concentration: "You are the concentration-risk reviewer for a crypto token. In max 120 words: whale/insider concentration, top-holder share, how fast price could collapse on coordinated sell. Cite mini-reports and debate only. No tools. English.",
};

export async function runL3(
  input: { chain: ChainId; mint: string; reports: ReportsBundle; debate: DebateTurn[]; chainToken: string },
  opts: { signal?: AbortSignal; emit?: (agent: string, report: string) => void } = {}
): Promise<L3Result> {
  if (!validateAddress(input.chain, input.mint)) throw new Error("Invalid address");
  if (!verifyChain(input.chainToken, "l2", input.chain, input.mint, input.debate)) throw new Error("Invalid layer chain");
  const transcript = input.debate.map((d) => `${d.side} (round ${d.round}): ${d.text}`).join("\n\n") || "(no debate held)";
  const settled = await Promise.allSettled(
    RISK_SLOTS.map(async (slot) => {
      const msgs: ChatMessage[] = [
        { role: "system", content: RISK_SYSTEM[slot] },
        {
          role: "user",
          content:
            `Network: ${CHAINS[input.chain].label}\n` +
            `Mini-reports:\n${formatReports(input.reports)}\n\n` +
            `Debate transcript:\n${transcript}\n\n` +
            `${MISSING_REPORT_RULE}`,
        },
      ];
      const report = await invokeWithRetry(msgs, { maxTokens: 800, timeoutMs: 20000, signal: opts.signal });
      opts.emit?.(`risk:${slot}`, report);
      return report;
    })
  );
  const risks = {} as L3Result["risks"];
  const errors: L3Result["errors"] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") risks[RISK_SLOTS[i]] = r.value;
    else {
      risks[RISK_SLOTS[i]] = MISSING_REPORT;
      errors.push({ agent: `risk:${RISK_SLOTS[i]}`, message: r.reason instanceof Error ? r.reason.message : String(r.reason) });
    }
  });
  return { risks, errors, chain: mintChain("l3", input.chain, input.mint, risks) };
}


