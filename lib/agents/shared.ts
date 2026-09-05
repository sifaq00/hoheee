import type { ChainId } from "@/lib/chains";
import { CHAINS } from "@/lib/chains";
import { runWithTools, type ChatMessage, type ToolCall } from "@/lib/llm";
import { TOOL_EXECUTORS, TOOL_SPECS, makeExecutors } from "@/lib/tools/index";
import type { AgentEvent, AgentId, TokenSummary } from "@/lib/pipeline/state";

export function buildBasePrompt(mint: string, summary: TokenSummary, chain: ChainId = "solana"): string {
  const today = new Date().toISOString().slice(0, 10);
  const net = CHAINS[chain].label;
  return (
    `You are a ${net} token research analyst. Current date: ${today}. ` +
    `Token: ${summary.name} (${summary.symbol}), contract ${mint} on ${net}, ` +
    `price ${summary.priceUsd}, 24h change ${summary.priceChange24h}%, ` +
    `liquidity $${summary.liquidityUsd}. ` +
    `Use tools to gather data, then write your final report as markdown. ` +
    `State which tools you used and any data limitations explicitly — ` +
    `honesty about missing data is required, never pretend certainty.`
  );
}

export async function runAnalyst(params: {
  agent: AgentId;
  mint: string;
  chain?: ChainId;
  summary: TokenSummary;
  systemRole: string;
  toolNames: string[];
  cap: number;
  emit: (e: AgentEvent) => void;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<string> {
  const chain: ChainId = params.chain ?? "solana";
  const net = CHAINS[chain].label;
  const executors = chain === "solana" ? TOOL_EXECUTORS : makeExecutors(chain);
  const tools = params.toolNames.map((n) => TOOL_SPECS[n]).filter(Boolean);
  const messages: ChatMessage[] = [
    { role: "system", content: `${buildBasePrompt(params.mint, params.summary, chain)}\n\n${params.systemRole}` },
    {
      role: "user",
      content:
        `Analyze ${net} token ${params.summary.name} (${params.summary.symbol}) ` +
        `with contract ${params.mint} on ${net}. Call the relevant tools with {"mint": "${params.mint}"} ` +
        `to gather evidence, then write your final report as markdown.`,
    },
  ];
  const execute = async (call: ToolCall): Promise<string> => {
    const fn = executors[call.function.name];
    if (!fn) return `unknown tool: ${call.function.name}`;
    try {
      return await fn(call.function.arguments);
    } catch (err) {
      return `tool ${call.function.name} failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  };
  return runWithTools({
    messages,
    tools,
    execute,
    maxIterations: params.cap,
    maxTokens: params.maxTokens,
    timeoutMs: params.timeoutMs,
    signal: params.signal,
    onEvent: (e) => {
      if (e.type === "reasoning") params.emit({ type: "reasoning", agent: params.agent, text: e.text ?? "" });
      else if (e.type === "tool_call")
        params.emit({ type: "tool_call", agent: params.agent, tool: e.tool ?? "", args: e.args ?? "" });
      else if (e.type === "tool_result")
        params.emit({
          type: "tool_result",
          agent: params.agent,
          tool: e.tool ?? "",
          summary: (e.result ?? "").slice(0, 500),
        });
      // content chunks accumulated silently; full report returned once to orchestrator
    },
  });
}
