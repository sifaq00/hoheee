export type ChainId = "solana" | "ethereum" | "bsc" | "base";

export interface ChainDef {
  id: ChainId;
  label: string;
  dexChainId: string;
  geckoPlatform: string;
  goplusId: string | null;
  wallet: "solana" | "evm";
}

const EVM_ADDR = /^0x[0-9a-fA-F]{40}$/;
const SOL_ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const CHAINS: Record<ChainId, ChainDef> = {
  solana: { id: "solana", label: "Solana", dexChainId: "solana", geckoPlatform: "solana", goplusId: null, wallet: "solana" },
  ethereum: { id: "ethereum", label: "Ethereum", dexChainId: "ethereum", geckoPlatform: "ethereum", goplusId: "1", wallet: "evm" },
  bsc: { id: "bsc", label: "BNB Chain", dexChainId: "bsc", geckoPlatform: "binance-smart-chain", goplusId: "56", wallet: "evm" },
  base: { id: "base", label: "Base", dexChainId: "base", geckoPlatform: "base", goplusId: "8453", wallet: "evm" },
};

export function isChainId(v: unknown): v is ChainId {
  return typeof v === "string" && (Object.keys(CHAINS) as string[]).includes(v);
}

export function validateAddress(chain: ChainId, mint: string): boolean {
  return (CHAINS[chain].wallet === "evm" ? EVM_ADDR : SOL_ADDR).test(mint);
}
