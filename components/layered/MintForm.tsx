"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TokenSummary } from "@/lib/pipeline/state";
import { fmtNum } from "@/lib/client/format";
import { MINT_REGEX } from "@/lib/layered/validate";

interface TokenPreview {
  mint: string;
  summary: TokenSummary;
}

type PreviewStatus = "none" | "loading" | "ok" | "not-found" | "error";

export default function MintForm({ disabled, onStart }: { disabled: boolean; onStart: (mint: string) => void }) {
  const [mint, setMint] = useState("");
  const [touched, setTouched] = useState(false);
  const [preview, setPreview] = useState<TokenPreview | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("none");
  const [previewError, setPreviewError] = useState("");
  const requestId = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = mint.trim();
  const valid = MINT_REGEX.test(trimmed);
  const showValidationError = touched && trimmed.length > 0 && !valid;
  const canRun = valid && !disabled && previewStatus === "ok" && preview !== null;

  const fetchPreview = useCallback(async (value: string): Promise<boolean> => {
    const id = ++requestId.current;
    setPreviewStatus("loading");
    setPreviewError("");
    try {
      const res = await fetch(`/api/tokens/${encodeURIComponent(value)}`);
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
  }, []);

  useEffect(() => {
    if (!valid || disabled) return;
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
    onStart(trimmed);
  }, [valid, disabled, preview, trimmed, onStart]);

  const fields = preview
    ? { name: preview.summary.name, symbol: preview.summary.symbol, price: preview.summary.priceUsd, liquidity: fmtNum(preview.summary.liquidityUsd), change: preview.summary.priceChange24h }
    : null;

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-3">
        <label htmlFor="mint" className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
          target_mint //
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
            placeholder="paste solana mint, press enter"
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
            Invalid mint address: expected 32-44 base58 characters.
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
        <button
          type="button"
          disabled={!canRun}
          onClick={handleStart}
          title={valid && previewStatus !== "ok" ? "Waiting for token preview…" : undefined}
          className="cursor-pointer rounded border border-[#22c55e] px-4 py-2 font-mono text-sm font-bold text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600 disabled:hover:bg-transparent"
        >
          Run analysis
        </button>
      )}
    </div>
  );
}
