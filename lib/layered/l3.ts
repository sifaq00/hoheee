import { MISSING_REPORT, MISSING_REPORT_RULE, formatReports, invokeWithRetry, type ReportsBundle } from "@/lib/agents/types";
import { MINT_REGEX } from "@/lib/pipeline/orchestrator";
import type { ChatMessage } from "@/lib/llm";
import { RISK_SLOTS, type DebateTurn, type L3Result, type RiskSlot } from "./types";

const RISK_SYSTEM: Record<RiskSlot, string> = {
  liquidity: "You are the liquidity-risk reviewer for a Solana token. In max 120 words: how thin is liquidity, expected slippage on exit, pool concentration. Cite mini-reports and debate only. No tools. English.",
  rugpath: "You are the rug-path reviewer for a Solana token. In max 120 words: mint/freeze authority status, named risk flags, unclosed rug paths. Cite mini-reports and debate only. No tools. English.",
  concentration: "You are the concentration-risk reviewer for a Solana token. In max 120 words: whale/insider concentration, top-holder share, how fast price could collapse on coordinated sell. Cite mini-reports and debate only. No tools. English.",
};

export async function runL3(
  input: { mint: string; reports: ReportsBundle; debate: DebateTurn[] },
  opts: { signal?: AbortSignal; emit?: (agent: string, report: string) => void } = {}
): Promise<L3Result> {
  if (!MINT_REGEX.test(input.mint)) throw new Error("Invalid Solana mint address");
  const transcript = input.debate.map((d) => `${d.side} (round ${d.round}): ${d.text}`).join("\n\n") || "(no debate held)";
  const settled = await Promise.allSettled(
    RISK_SLOTS.map(async (slot) => {
      const msgs: ChatMessage[] = [
        { role: "system", content: RISK_SYSTEM[slot] },
        {
          role: "user",
          content:
            `Mini-reports:\n${formatReports(input.reports)}\n\n` +
            `Debate transcript:\n${transcript}\n\n` +
            `${MISSING_REPORT_RULE}`,
        },
      ];
      const report = await invokeWithRetry(msgs, { maxTokens: 500, timeoutMs: 12000, signal: opts.signal });
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
  return { risks, errors };
}
