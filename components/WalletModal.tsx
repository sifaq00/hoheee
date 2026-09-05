"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SOLANA_WALLETS, useWallet, type SolanaWalletOption } from "@/context/WalletContext";

function getPhantomProvider() {
  if (typeof window === "undefined") return null;
  if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
  if (window.solana?.isPhantom) return window.solana;
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, errMsg: string): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errMsg)), ms))]);
}

export default function WalletModal() {
  const { isModalOpen, setIsModalOpen, connect } = useWallet();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- reset transient modal state on close */
  useEffect(() => {
    if (!isModalOpen) {
      setErrorMessage(null);
      setConnectingId(null);
    }
  }, [isModalOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    if (isModalOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen, setIsModalOpen]);

  const select = async (wallet: SolanaWalletOption) => {
    setConnectingId(wallet.id);
    setErrorMessage(null);
    if (!wallet.detect()) {
      try {
        window.open(wallet.installUrl, "_blank", "noopener,noreferrer");
      } catch {
        // popup blocked: ignore
      }
      setErrorMessage(`${wallet.name} not detected. Install it, then try again.`);
      setConnectingId(null);
      return;
    }
    try {
      if (wallet.id === "phantom") {
        const provider = getPhantomProvider();
        const res = await withTimeout(provider!.connect!(), 12000, "Phantom connection timed out. Unlock your wallet.");
        const addr = res?.publicKey?.toString?.();
        if (addr) {
          connect(wallet, addr);
          setIsModalOpen(false);
        }
      } else if (wallet.id === "solflare" && window.solflare) {
        await withTimeout(window.solflare.connect!(), 12000, "Solflare connection timed out.");
        const addr = window.solflare.publicKey?.toString?.();
        if (addr) {
          connect(wallet, addr);
          setIsModalOpen(false);
        }
      } else if (wallet.id === "backpack" && window.backpack) {
        const res = await withTimeout(window.backpack.connect!(), 12000, "Backpack connection timed out.");
        const addr = res?.publicKey?.toString?.();
        if (addr) {
          connect(wallet, addr);
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg.includes("rejected") || msg.includes("cancelled") ? "Connection cancelled." : msg);
    }
    setConnectingId(null);
  };

  if (!isModalOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Connect wallet">
      <div className="absolute inset-0 bg-black/70" onClick={() => setIsModalOpen(false)} />
      <div className="relative w-full max-w-sm rounded border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Connect Solana wallet</h2>
          <button type="button" aria-label="Close" onClick={() => setIsModalOpen(false)} className="rounded px-2 py-1 text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Optional. Unlocks your report history on this device.</p>
        <div className="mt-4 flex flex-col gap-2">
          {SOLANA_WALLETS.map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={connectingId !== null}
              onClick={() => void select(w)}
              className="flex items-center gap-3 rounded border border-zinc-800 px-3 py-2 text-left text-sm hover:border-[#22c55e] disabled:opacity-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static local svg, no optimizer needed */}
              <img src={w.icon} alt="" width={24} height={24} />
              <span className="flex-1 font-medium">{w.name}</span>
              <span className="font-mono text-xs text-zinc-500">{connectingId === w.id ? "…" : wallet_detect(w) ? "detected" : "install"}</span>
            </button>
          ))}
        </div>
        {errorMessage && (
          <p role="alert" className="mt-3 text-sm text-[#ef4444]">
            {errorMessage}
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}

function wallet_detect(w: SolanaWalletOption): boolean {
  try {
    return w.detect();
  } catch {
    return false;
  }
}
