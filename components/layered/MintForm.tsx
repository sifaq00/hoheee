"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TokenSummary } from "@/lib/pipeline/state";
import { fmtNum } from "@/lib/client/format";
import { CHAINS, validateAddress, type ChainId } from "@/lib/chains";

interface TokenPreview {
  mint: string;
  summary: TokenSummary;
}

type PreviewStatus = "none" | "loading" | "ok" | "not-found" | "error";

const SAMPLES: Record<ChainId, { label: string; mint: string }[]> = {
  solana: [
    { label: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
    { label: "WIF", mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" },
    { label: "JUP", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
  ],
  ethereum: [
    { label: "USDT", mint: "0xdac17f958d2ee523a2206206994597c13d831ec7" },
    { label: "PEPE", mint: "0x6982508145454ce325ddbe47a25d4ec3d2311933" },
    { label: "WETH", mint: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
  ],
  bsc: [
    { label: "CAKE", mint: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82" },
    { label: "WBNB", mint: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" },
  ],
  base: [
    { label: "WETH", mint: "0x4200000000000000000000000000000000000006" },
    { label: "TOSHI", mint: "0xac1bd7fA6a0c454fFebc0a9Aa4AbdfA5Becd0d8d5" },
  ],
  bitcoin: [{ label: "BTC", mint: "BTC" }],
  robinhood: [{ label: "SIZE", mint: "0x0F421d05e67B9E25D754e8e685af91b37bFf6CEf" }],
};

export default function MintForm({
  disabled,
  chain,
  onChain,
  onStart,
}: {
  disabled: boolean;
  chain: ChainId;
  onChain: (c: ChainId) => void;
  onStart: (chain: ChainId, mint: string) => void;
}) {
  const [mint, setMint] = useState("");
  const [touched, setTouched] = useState(false);
  const [preview, setPreview] = useState<TokenPreview | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("none");
  const [previewError, setPreviewError] = useState("");
  const requestId = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipDebounceRef = useRef(false);

  const trimmed = mint.trim();
  const valid = validateAddress(chain, trimmed);
  const showValidationError = touched && trimmed.length > 0 && !valid;
  const canRun = valid && !disabled && previewStatus === "ok" && preview !== null;

  const fetchPreview = useCallback(
    async (value: string): Promise<boolean> => {
      const id = ++requestId.current;
      setPreviewStatus("loading");
      setPreviewError("");
      try {
        const res = await fetch(`/api/tokens/${encodeURIComponent(value)}?chain=${chain}`);
        if (id !== requestId.current) return false;
        if (res.status === 404) {
          setPreview(null);
          setPreviewStatus("not-found");
          return false;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          setPreview(null);
          setPreviewStatus("error");
          setPreviewError(data?.error ?? `Preview request failed: ${res.status}`);
          return false;
        }
        setPreview((await res.json()) as TokenPreview);
        setPreviewStatus("ok");
        return true;
      } catch (err) {
        if (id !== requestId.current) return false;
        setPreview(null);
        setPreviewStatus("error");
        setPreviewError(err instanceof Error ? err.message : String(err));
        return false;
      }
    },
    [chain]
  );

  useEffect(() => {
    if (!valid || disabled) return;
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchPreview(trimmed);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmed, valid, disabled, fetchPreview]);

  const handleStart = useCallback(() => {
    if (!valid || disabled || !preview) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onStart(chain, trimmed);
  }, [valid, disabled, preview, trimmed, chain, onStart]);

  const trySample = useCallback(
    (value: string) => {
      if (disabled) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      skipDebounceRef.current = true;
      setMint(value);
      setTouched(true);
      setPreviewStatus("none");
      setPreview(null);
      setPreviewError("");
      void fetchPreview(value);
    },
    [disabled, fetchPreview]
  );

  const fields = preview
    ? { name: preview.summary.name, symbol: preview.summary.symbol, price: preview.summary.priceUsd, liquidity: fmtNum(preview.summary.liquidityUsd), change: preview.summary.priceChange24h }
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Network">
        {(Object.keys(CHAINS) as ChainId[]).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={chain === c}
            disabled={disabled}
            onClick={() => {
              onChain(c);
              setMint("");
              setTouched(false);
              setPreview(null);
              setPreviewStatus("none");
              setPreviewError("");
            }}
            className={`cursor-pointer rounded border px-3 py-1 font-mono text-xs font-bold tracking-wider uppercase disabled:opacity-50 ${
              chain === c
                ? "border-[#22c55e] bg-[#22c55e] text-black"
                : "border-zinc-800 text-zinc-400 hover:border-[#22c55e] hover:text-[#22c55e]"
            }`}
          >
            {CHAINS[c].label}
          </button>
        ))}
      </div>
      <section className="flex flex-col gap-3">
        <label htmlFor="mint" className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
          target_contract //
        </label>
        <div className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950 px-3 focus-within:border-[#22c55e]">
          <span aria-hidden="true" className="font-mono text-sm font-bold text-[#22c55e]">
            &gt;
          </span>
          <input
            id="mint"
            type="text"
            spellCheck={false}
            autoComplete="off"
            placeholder={chain === "solana" ? "paste solana mint, press enter" : chain === "bitcoin" ? "type BTC, press enter" : "paste 0x contract, press enter"}
            value={mint}
            disabled={disabled}
            onChange={(e) => {
              setMint(e.target.value);
              setTouched(true);
              setPreviewStatus("none");
              setPreview(null);
              setPreviewError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && valid) handleStart();
            }}
            className="w-full bg-transparent py-2.5 font-mono text-sm text-[#e5e5e5] placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
          />
          {previewStatus === "loading" && <span aria-hidden="true" className="font-mono text-xs text-[#22c55e] animate-pulse">…</span>}
        </div>
        {showValidationError && (
          <p role="alert" className="text-sm text-[#ef4444]">
            {chain === "solana"
              ? "Invalid mint address: expected 32-44 base58 characters."
              : chain === "bitcoin"
                ? "Type BTC for native Bitcoin."
                : "Invalid contract address: expected 0x plus 40 hex characters."}
          </p>
        )}
        {previewStatus === "loading" && <p className="font-mono text-xs text-zinc-400">resolving preview…</p>}
        {previewStatus === "not-found" && (
          <p role="alert" className="text-sm text-[#ef4444]">
            Token not found on DexScreener
          </p>
        )}
        {previewStatus === "error" && (
          <p role="alert" className="text-sm text-[#ef4444]">
            {previewError}
          </p>
        )}
      </section>

      {preview && fields && previewStatus === "ok" && !disabled && (
        <section aria-label="Token preview" className="rounded border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="text-base font-semibold">
            {fields.name} <span className="text-zinc-400">({fields.symbol})</span>
          </h2>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-zinc-500">Price</dt>
              <dd className="font-mono">${fields.price}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Liquidity USD</dt>
              <dd className="font-mono">${fields.liquidity}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">24h change</dt>
              <dd className={`font-mono ${fields.change >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>{fields.change}%</dd>
            </div>
          </dl>
        </section>
      )}

      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canRun}
            onClick={handleStart}
            title={valid && previewStatus !== "ok" ? "Waiting for token preview…" : undefined}
            className="cursor-pointer rounded border border-[#22c55e] bg-[#22c55e] px-5 py-2 font-mono text-sm font-bold text-black transition-colors hover:bg-transparent hover:text-[#22c55e] disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-transparent disabled:text-zinc-600"
          >
            Run analysis
          </button>
          <span className="font-mono text-[10px] tracking-[0.18em] text-zinc-600 uppercase">try →</span>
          {SAMPLES[chain].map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => trySample(s.mint)}
              className="cursor-pointer rounded border border-zinc-800 px-2.5 py-1 font-mono text-xs text-zinc-400 transition-colors hover:border-[#22c55e] hover:text-[#22c55e]"
            >
              ${s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
