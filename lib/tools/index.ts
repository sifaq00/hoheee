import type { ChainId } from "@/lib/chains";
import type { ToolSpec } from "@/lib/llm";
import { getTokenProfile, getTokenProfileFor, getTopPools, getTopPoolsFor } from "./dexscreener";
import { getRiskReport, getHolderDistribution } from "./rugcheck";
import { getGoplusRisk } from "./goplus";
import { getCoinMetadata, getCoinMetadataFor, getPriceHistory, getPriceHistoryFor } from "./coingecko";

type Executor = (argsJson: string) => Promise<string>;

function bind(fn: (mint: string) => Promise<string>): Executor {
  return async (argsJson: string) => {
    let mint: string;
    try {
      const args = JSON.parse(argsJson);
      mint = String(args.mint ?? "");
    } catch {
      return "invalid arguments: expected JSON with a 'mint' string field";
    }
    if (!mint) return "invalid arguments: 'mint' is required";
    return fn(mint);
  };
}

const MINT_PARAM = {
  type: "object",
  properties: {
    mint: {
      type: "string",
      description: "Token contract address (Solana base58 or EVM 0x)",
    },
  },
  required: ["mint"],
};

/** LLM-facing tool registry (bind with runWithTools in Task 4). */
export const TOOL_SPECS: Record<string, ToolSpec> = {
  get_token_profile: {
    type: "function",
    function: {
      name: "get_token_profile",
      description:
        "Get current market profile of a token from DexScreener: price, liquidity, 24h volume/transactions, price changes (5m/1h/6h/24h), market cap, FDV, and pool age, taken from its largest-liquidity pool. Use first for a quick market overview.",
      parameters: MINT_PARAM,
    },
  },
  get_top_pools: {
    type: "function",
    function: {
      name: "get_top_pools",
      description:
        "List the top 5 DEX pools for a token by liquidity (DexScreener): DEX name, pair address, liquidity, 24h volume, and price per pool. Use to gauge where the token actually trades and how deep each venue is.",
      parameters: MINT_PARAM,
    },
  },
  get_risk_report: {
    type: "function",
    function: {
      name: "get_risk_report",
      description:
        "Get the RugCheck risk report for a Solana token: risk score, rugged status, mint/freeze authority (revoked vs active), holder/LP counts, and named risk flags. Use to evaluate rug, authority, and scam risks.",
      parameters: MINT_PARAM,
    },
  },
  get_holder_distribution: {
    type: "function",
    function: {
      name: "get_holder_distribution",
      description:
        "Get top-holder concentration for a token from RugCheck: the 10 largest holders with their supply percentage and insider flags, plus total holders. Use to assess whale/insider concentration risk.",
      parameters: MINT_PARAM,
    },
  },
  get_coin_metadata: {
    type: "function",
    function: {
      name: "get_coin_metadata",
      description:
        "Get CoinGecko metadata for a token: categories, description, watchlist count, community sentiment, twitter followers, price, 24h volume, and ATH distance. Only works for tokens listed on CoinGecko. Use for qualitative/narrative context.",
      parameters: MINT_PARAM,
    },
  },
  get_price_history: {
    type: "function",
    function: {
      name: "get_price_history",
      description:
        "Get 30 days of daily USD price history for a token from CoinGecko (date: price per line). Only works for tokens listed on CoinGecko. Use for trend and momentum analysis.",
      parameters: MINT_PARAM,
    },
  },
  get_goplus_risk: {
    type: "function",
    function: {
      name: "get_goplus_risk",
      description:
        "Get the GoPlus security report for an EVM token contract: honeypot status, buy/sell taxes, mintable/proxy flags, owner, blacklist status, holder counts. Use to evaluate contract and scam risks on EVM chains.",
      parameters: MINT_PARAM,
    },
  },
};

export const TOOL_EXECUTORS: Record<string, Executor> = {
  get_token_profile: bind(getTokenProfile),
  get_top_pools: bind(getTopPools),
  get_risk_report: bind(getRiskReport),
  get_holder_distribution: bind(getHolderDistribution),
  get_coin_metadata: bind(getCoinMetadata),
  get_price_history: bind(getPriceHistory),
};

// Chain-bound executors: same tool names, fetchers routed per network.
export function makeExecutors(chain: ChainId): Record<string, Executor> {
  if (chain === "solana") return TOOL_EXECUTORS;
  const forChain = (fn: (c: ChainId, m: string) => Promise<string>): Executor => {
    return async (argsJson: string) => {
      let mint: string;
      try {
        mint = String(JSON.parse(argsJson).mint ?? "");
      } catch {
        return "invalid arguments: expected JSON with a 'mint' string field";
      }
      if (!mint) return "invalid arguments: 'mint' is required";
      return fn(chain, mint);
    };
  };
  return {
    get_token_profile: forChain(getTokenProfileFor),
    get_top_pools: forChain(getTopPoolsFor),
    get_risk_report: forChain(getGoplusRisk),
    get_holder_distribution: forChain(getGoplusRisk),
    get_coin_metadata: forChain(getCoinMetadataFor),
    get_price_history: forChain(getPriceHistoryFor),
    get_goplus_risk: forChain(getGoplusRisk),
  };
}

// Tool allow-list per analyst slot (single source of truth).
export const ANALYST_TOOLS: Record<"onchain" | "technical" | "sentiment" | "news", string[]> = {
  onchain: ["get_token_profile", "get_top_pools", "get_risk_report", "get_holder_distribution"],
  technical: ["get_token_profile", "get_price_history"],
  sentiment: ["get_token_profile", "get_coin_metadata"],
  news: ["get_coin_metadata", "get_token_profile"],
};

// EVM swaps RugCheck tools for GoPlus (same slots, same cap).
export function analystToolsFor(chain: ChainId): Record<"onchain" | "technical" | "sentiment" | "news", string[]> {
  if (chain === "solana") return ANALYST_TOOLS;
  return {
    onchain: ["get_token_profile", "get_top_pools", "get_goplus_risk"],
    technical: ["get_token_profile", "get_price_history"],
    sentiment: ["get_token_profile", "get_coin_metadata"],
    news: ["get_coin_metadata", "get_token_profile"],
  };
}

