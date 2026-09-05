import { createHmac, timingSafeEqual } from "node:crypto";

export type ChainLayer = "l1" | "l2" | "l3";

function secret(explicit?: string): string {
  return explicit ?? process.env.CHAIN_SECRET ?? "dev-only-chain-secret";
}

function canonical(layer: ChainLayer, mint: string, payload: unknown): string {
  return `${layer}.${mint}.${JSON.stringify(payload)}`;
}

// Token format: base64url(sig). Minted by layer N, consumed by layer N+1.
export function mintChain(layer: ChainLayer, mint: string, payload: unknown, key?: string): string {
  const sig = createHmac("sha256", secret(key)).update(canonical(layer, mint, payload), "utf8").digest("base64url");
  return sig;
}

export function verifyChain(token: string, layer: ChainLayer, mint: string, payload: unknown, key?: string): boolean {
  if (typeof token !== "string" || token.length === 0) return false;
  const want = createHmac("sha256", secret(key)).update(canonical(layer, mint, payload), "utf8").digest();
  let got: Buffer;
  try {
    got = Buffer.from(token, "base64url");
  } catch {
    return false;
  }
  return got.length === want.length && timingSafeEqual(got, want);
}
