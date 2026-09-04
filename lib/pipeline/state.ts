export interface TokenSummary {
  name: string;
  symbol: string;
  priceUsd: string;
  liquidityUsd: number;
  priceChange24h: number;
  marketCap?: number;
  ageDays?: number;
}

export type AgentId =
  | "onchain"
  | "technical"
  | "sentiment"
  | "news"
  | "bull"
  | "bear"
  | "research_manager"
  | "trader"
  | "aggressive"
  | "conservative"
  | "neutral"
  | "portfolio_manager"
  | "orchestrator";

export interface PipelineState {
  mint: string;
  summary: TokenSummary;
  reports: Partial<Record<"onchain" | "technical" | "sentiment" | "news", string>>;
  debateHistory: string;
  investmentPlan: string;
  traderPlan: string;
  riskDebateHistory: string;
  finalDecision: string;
}

export type AgentEvent =
  | { type: "token_found"; name: string; price: string; liquidity: number; change24h: number }
  | { type: "agent_start"; agent: AgentId }
  | { type: "reasoning"; agent: AgentId; text: string }
  | { type: "tool_call"; agent: AgentId; tool: string; args: string }
  | { type: "tool_result"; agent: AgentId; tool: string; summary: string }
  | { type: "agent_report"; agent: AgentId; report: string }
  | { type: "debate_turn"; phase: "invest" | "risk"; round: number; side: string; text: string }
  | { type: "decision"; markdown: string }
  | { type: "error"; agent: AgentId; message: string }
  | { type: "done"; runId: string };
