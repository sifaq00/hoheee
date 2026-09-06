import { describe, it, expect } from "vitest";
import { CHAINS, isChainId, validateAddress } from "../lib/chains";

describe("chains", () => {
  it("registers 6 chains with distinct dex ids", () => {
    expect(Object.keys(CHAINS).sort()).toEqual(["base", "bitcoin", "bsc", "ethereum", "robinhood", "solana"]);
    expect(CHAINS.bsc.dexChainId).toBe("bsc");
    expect(CHAINS.ethereum.goplusId).toBe("1");
    expect(CHAINS.solana.goplusId).toBeNull();
    expect(CHAINS.bitcoin.dexChainId).toBeNull();
    expect(CHAINS.robinhood.dexChainId).toBe("robinhood");
    expect(CHAINS.robinhood.goplusId).toBe("4663");
    expect(CHAINS.robinhood.geckoPlatform).toBeNull();
  });

  it("validates addresses per chain", () => {
    expect(validateAddress("solana", "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")).toBe(true);
    expect(validateAddress("ethereum", "0xdac17f958d2ee523a2206206994597c13d831ec7")).toBe(true);
    expect(validateAddress("ethereum", "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")).toBe(false);
    expect(validateAddress("solana", "0xdac17f958d2ee523a2206206994597c13d831ec7")).toBe(false);
    expect(validateAddress("bitcoin", "BTC")).toBe(true);
    expect(validateAddress("bitcoin", "0xdac17f958d2ee523a2206206994597c13d831ec7")).toBe(false);
    expect(isChainId("doge")).toBe(false);
  });
});
