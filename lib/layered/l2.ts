import { MISSING_REPORT_RULE, formatReports, invokeWithRetry, type ReportsBundle } from "@/lib/agents/types";
import type { ChatMessage } from "@/lib/llm";
import { MINT_REGEX } from "@/lib/pipeline/orchestrator";
import type { DebateTurn, L2Result } from "./types";

export type DebateEmit = (turn: DebateTurn) => void;

const BULL_SYSTEM = "You are a Bull Analyst for a Solana token. Argue FOR investing in max 150 words, citing only the mini-reports. No tools. English.";
const BEAR_SYSTEM = "You are a Bear Analyst for a Solana token. Argue AGAINST investing in max 150 words, citing only the mini-reports. No tools. English.";

export async function runL2(
  input: { mint: string; reports: ReportsBundle; rounds?: number },
  opts: { signal?: AbortSignal; emit?: DebateEmit } = {}
): Promise<L2Result> {
  if (!MINT_REGEX.test(input.mint)) throw new Error("Invalid Solana mint address");
  const rounds = input.rounds ?? 2;
  const debate: DebateTurn[] = [];
  const errors: L2Result["errors"] = [];
  let transcript = "";
  for (let round = 1; round <= rounds; round++) {
    for (const side of ["bull", "bear"] as const) {
      if (opts.signal?.aborted) return { debate, errors };
      const other = side === "bull" ? transcript || "(none yet)" : debate.filter((d) => d.side === "bull").map((d) => d.text).join("\n") || "(none yet)";
      const msgs: ChatMessage[] = [
        { role: "system", content: side === "bull" ? BULL_SYSTEM : BEAR_SYSTEM },
        {
          role: "user",
          content:
            `Mini-reports:\n${formatReports(input.reports)}\n\n` +
            `Opposing argument so far:\n${other}\n\n` +
            `${MISSING_REPORT_RULE}\n\n` +
            "Rebut directly or open with your strongest case.",
        },
      ];
      try {
        const text = await invokeWithRetry(msgs, { maxTokens: 500, timeoutMs: 12000, signal: opts.signal });
        const turn: DebateTurn = { phase: "invest", round, side, text };
        debate.push(turn);
        opts.emit?.(turn);
        transcript += `${side} (round ${round}):\n${text}\n\n`;
      } catch (err) {
        if (!opts.signal?.aborted) errors.push({ agent: side, message: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  return { debate, errors };
}
