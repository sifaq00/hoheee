"use client";

import { fmtNum } from "@/lib/client/format";

interface TokenCardProps {
  name: string;
  symbol?: string;
  price: string;
  liquidity: number;
  change24h: number;
}

// Feed header card for token_found events.
export default function TokenCard({ name, symbol, price, liquidity, change24h }: TokenCardProps) {
  const positive = change24h >= 0;
  return (
    <section
      aria-label="Token found"
      data-testid="token-card"
      className="rounded border border-zinc-800 bg-zinc-950 p-4"
    >
      <h2 className="text-base font-semibold">
        {name} {symbol && <span className="text-zinc-400">({symbol})</span>}
      </h2>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-zinc-500">Price</dt>
          <dd className="font-mono">${price}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Liquidity USD</dt>
          <dd className="font-mono">${fmtNum(liquidity)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">24h change</dt>
          <dd className={`font-mono ${positive ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
            {change24h}%
          </dd>
        </div>
      </dl>
    </section>
  );
}
