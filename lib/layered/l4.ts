import { MISSING_REPORT_RULE, formatReports, invokeWithRetry, type ReportsBundle } from "@/lib/agents/types";
import { parseDecision } from "@/lib/decision";
import type { ChatMessage } from "@/lib/llm";
import { MINT_REGEX } from "@/lib/pipeline/orchestrator";
import { saveReport } from "./supabase";
import type { DebateTurn, L1Result, L3Result, L4Result } from "./types";

const DECIDER_SYSTEM = "You are the Portfolio Manager. Decide fast from mini-reports, one debate, and the risk review. No tools. English.";
const DECIDER_STRUCTURE =
  "Your output MUST be machine-parseable with this exact structure:\n" +
  "RATING: <exactly one of Buy, Overweight, Hold, Underweight, Sell>\n" +
  "CONFIDENCE: <exactly one of Low, Medium, High>\n" +
  "KEY RISKS:\n" +
  "- <bullet per risk>\n" +
  "EXECUTIVE SUMMARY\n" +
  "<concise action plan>\n" +
  "INVESTMENT THESIS\n" +
  "<concise reasoning>";

export async function runL4(
  input: {
    mint: string;
    model?: string;
    wallet?: string;
    token: L1Result["token"];
    symbol: string;
    reports: ReportsBundle;
    debate: DebateTurn[];
    risks: L3Result["risks"];
  },
  opts: { signal?: AbortSignal } = {}
): Promise<L4Result> {
  if (!MINT_REGEX.test(input.mint)) throw new Error("Invalid Solana mint address");
  const transcript = input.debate.map((d) => `${d.side} (round ${d.round}): ${d.text}`).join("\n\n") || "(no debate held)";
  const riskText = `liquidity: ${input.risks.liquidity}\nrugpath: ${input.risks.rugpath}\nconcentration: ${input.risks.concentration}`;
  const msgs: ChatMessage[] = [
    { role: "system", content: DECIDER_SYSTEM },
    {
      role: "user",
      content:
        `Mini-reports:\n${formatReports(input.reports)}\n\n` +
        `Debate transcript:\n${transcript}\n\n` +
        `Risk review:\n${riskText}\n\n` +
        `${MISSING_REPORT_RULE}\n\n` +
        DECIDER_STRUCTURE,
    },
  ];
  const decision = await invokeWithRetry(msgs, { maxTokens: 1000, timeoutMs: 15000, signal: opts.signal });
  if (!decision.trim()) throw new Error("empty decision");
  const parsed = parseDecision(decision);
  const model = input.model ?? process.env.LLM_MODEL ?? "unknown";
  const { id } = await saveReport({
    mint: input.mint,
    model,
    wallet: input.wallet ?? null,
    token: { name: input.token.name, price: Number(input.token.price) || 0, liquidity: input.token.liquidity, change24h: input.token.change24h, symbol: input.symbol },
    reports: { ...input.reports },
    debate: input.debate.map((d) => ({ ...d })),
    risks: { ...input.risks },
    decision,
    rating: parsed.rating,
    confidence: parsed.confidence,
  });
  return { decision, rating: parsed.rating, confidence: parsed.confidence, id };
}
