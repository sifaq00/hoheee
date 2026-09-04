export const CONFIG = {
  MAX_DEBATE_ROUNDS: 2,
  MAX_RISK_ROUNDS: 2,
  ANALYST_TOOL_CAP: { onchain: 5, technical: 5, sentiment: 4, news: 4 } as const,
  PARALLEL_ANALYSTS: true,
};
