import { runWithTools, type ChatMessage, type ToolCall } from "@/lib/llm";
import { TOOL_EXECUTORS, TOOL_SPECS } from "@/lib/tools/index";
import type { AgentEvent, AgentId, TokenSummary } from "@/lib/pipeline/state";

export function buildBasePrompt(mint: string, summary: TokenSummary): string {
  const today = new Date().toISOString().slice(0, 10);
  return (
    `You are a Solana token research analyst. Current date: ${today}. ` +
    `Token: ${summary.name} (${summary.symbol}), mint ${mint}, ` +
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
  summary: TokenSummary;
  systemRole: string;
  toolNames: string[];
  cap: number;
  emit: (e: AgentEvent) => void;
}): Promise<string> {
  const tools = params.toolNames.map((n) => TOOL_SPECS[n]).filter(Boolean);
  const messages: ChatMessage[] = [
    { role: "system", content: `${buildBasePrompt(params.mint, params.summary)}\n\n${params.systemRole}` },
    {
      role: "user",
      content:
        `Analyze Solana token ${params.summary.name} (${params.summary.symbol}) ` +
        `with mint ${params.mint}. Call the relevant tools with {"mint": "${params.mint}"} ` +
        `to gather evidence, then write your final report as markdown.`,
    },
  ];
  const execute = async (call: ToolCall): Promise<string> => {
    const fn = TOOL_EXECUTORS[call.function.name];
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
