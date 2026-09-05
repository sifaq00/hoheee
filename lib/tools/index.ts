import type { ToolSpec } from "@/lib/llm";
import { getTokenProfile, getTopPools } from "./dexscreener";
import { getRiskReport, getHolderDistribution } from "./rugcheck";
import { getCoinMetadata, getPriceHistory } from "./coingecko";

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
      description: "Solana token mint address (base58, e.g. DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263)",
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
        "Get current market profile of a Solana token from DexScreener: price, liquidity, 24h volume/transactions, price changes (5m/1h/6h/24h), market cap, FDV, and pool age, taken from its largest-liquidity pool. Use first for a quick market overview.",
      parameters: MINT_PARAM,
    },
  },
  get_top_pools: {
    type: "function",
    function: {
      name: "get_top_pools",
      description:
        "List the top 5 DEX pools for a Solana token by liquidity (DexScreener): DEX name, pair address, liquidity, 24h volume, and price per pool. Use to gauge where the token actually trades and how deep each venue is.",
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
        "Get top-holder concentration for a Solana token from RugCheck: the 10 largest holders with their supply percentage and insider flags, plus total holders. Use to assess whale/insider concentration risk.",
      parameters: MINT_PARAM,
    },
  },
  get_coin_metadata: {
    type: "function",
    function: {
      name: "get_coin_metadata",
      description:
        "Get CoinGecko metadata for a Solana token: categories, description, watchlist count, community sentiment, twitter followers, price, 24h volume, and ATH distance. Only works for tokens listed on CoinGecko. Use for qualitative/narrative context.",
      parameters: MINT_PARAM,
    },
  },
  get_price_history: {
    type: "function",
    function: {
      name: "get_price_history",
      description:
        "Get 30 days of daily USD price history for a Solana token from CoinGecko (date: price per line). Only works for tokens listed on CoinGecko. Use for trend and momentum analysis.",
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

// Tool allow-list per analyst slot (single source of truth).
export const ANALYST_TOOLS: Record<"onchain" | "technical" | "sentiment" | "news", string[]> = {
  onchain: ["get_token_profile", "get_top_pools", "get_risk_report", "get_holder_distribution"],
  technical: ["get_token_profile", "get_price_history"],
  sentiment: ["get_token_profile", "get_coin_metadata"],
  news: ["get_coin_metadata", "get_token_profile"],
};
