export interface LayerError {
  agent: string;
  message: string;
}

export interface L1Result {
  token: { name: string; price: string; liquidity: number; change24h: number };
  symbol: string;
  reports: Record<"onchain" | "technical" | "sentiment" | "news", string>;
  errors: LayerError[];
  chain: string;
}

export interface DebateTurn {
  phase: "invest";
  round: number;
  side: "bull" | "bear";
  text: string;
}

export interface L2Result {
  debate: DebateTurn[];
  errors: LayerError[];
  chain: string;
}

export type RiskSlot = "liquidity" | "rugpath" | "concentration";

export const RISK_SLOTS: RiskSlot[] = ["liquidity", "rugpath", "concentration"];

export interface L3Result {
  risks: Record<RiskSlot, string>;
  errors: LayerError[];
  chain: string;
}

export interface L4Result {
  decision: string;
  rating: string | null;
  confidence: string | null;
  id: string;
}
