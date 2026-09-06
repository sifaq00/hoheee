"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@/context/WalletContext";

export default function WalletButton() {
  const { connected, address, shortAddress, walletIcon, walletName, setIsModalOpen, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const isEvm = address.startsWith("0x");

  const fetchBalance = async () => {
    if (!address) return;
    setRefreshing(true);
    try {
      if (isEvm && typeof window !== "undefined" && window.ethereum?.request) {
        const req = window.ethereum.request as (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        const hex = (await req({ method: "eth_getBalance", params: [address, "latest"] })) as string;
        setBalance(`${(Number(BigInt(hex)) / 1e18).toFixed(4)} native`);
      } else if (!isEvm) {
        const endpoints = ["https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"];
        let lamports: number | undefined;
        for (const url of endpoints) {
          try {
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }),
            });
            if (!res.ok) continue;
            const data = (await res.json()) as { result?: { value?: number } };
            if (typeof data.result?.value === "number") {
              lamports = data.result.value;
              break;
            }
          } catch {
            // try next endpoint
          }
        }
        setBalance(lamports === undefined ? "n/a" : `${(lamports / 1e9).toFixed(4)} SOL`);
      } else {
        setBalance("n/a");
      }
    } catch {
      setBalance("n/a");
    }
    setRefreshing(false);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  if (!connected) {
    return (
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="cursor-pointer rounded border border-[#22c55e] px-3 py-1.5 text-sm font-semibold text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black"
      >
        Connect wallet
      </button>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard denied: ignore
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void fetchBalance();
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title={address}
        className="flex cursor-pointer items-center gap-2 rounded border border-zinc-700 px-3 py-1.5 font-mono text-sm text-zinc-300 transition-colors hover:border-[#22c55e] hover:text-white"
      >
        {walletIcon ? (
          // eslint-disable-next-line @next/next/no-img-element -- static local asset
          <img src={walletIcon} alt="" width={18} height={18} />
        ) : (
          <span aria-hidden="true" className="flex h-[18px] w-[18px] items-center justify-center rounded bg-black font-mono text-[10px] font-bold text-[#22c55e]">
            {walletName.slice(0, 1)}
          </span>
        )}
        {shortAddress}
      </button>
      {open && (
        <div role="menu" aria-label="Wallet identity" className="absolute top-full right-0 z-50 mt-2 w-72 rounded border border-zinc-800 bg-zinc-950 p-4 shadow-xl">
          <div className="flex items-center gap-2">
            {walletIcon ? (
              // eslint-disable-next-line @next/next/no-img-element -- static local asset
              <img src={walletIcon} alt="" width={22} height={22} />
            ) : (
              <span aria-hidden="true" className="flex h-[22px] w-[22px] items-center justify-center rounded bg-black font-mono text-xs font-bold text-[#22c55e]">
                {walletName.slice(0, 1)}
              </span>
            )}
            <p className="text-sm font-semibold text-white">{walletName}</p>
          </div>
          <button
            type="button"
            onClick={() => void copy()}
            title="Copy full address"
            className="mt-3 w-full cursor-pointer rounded border border-zinc-800 bg-black px-2 py-2 text-left font-mono text-xs break-all text-zinc-300 transition-colors hover:border-[#22c55e] hover:text-white"
          >
            {address}
          </button>
          <p className="mt-1 font-mono text-[10px] text-zinc-500">{copied ? "Copied ✓" : "Click address to copy"}</p>
          <div className="mt-2 flex items-center justify-between rounded border border-zinc-800 bg-black px-2 py-1.5">
            <p className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">Balance</p>
            <p className="font-mono text-xs font-bold text-white">
              {refreshing ? "…" : (balance ?? "…")}
              <button
                type="button"
                onClick={() => void fetchBalance()}
                aria-label="Refresh balance"
                className={`ml-2 cursor-pointer text-zinc-500 hover:text-[#22c55e] ${refreshing ? "animate-spin" : ""}`}
              >
                ↻
              </button>
            </p>
          </div>
          <a
            href={isEvm ? `https://etherscan.io/address/${address}` : `https://solscan.io/account/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block rounded border border-zinc-800 px-2 py-1.5 text-center font-mono text-xs text-zinc-300 transition-colors hover:border-[#22c55e] hover:text-white"
          >
            View on explorer ↗
          </a>
          <button
            type="button"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            className="mt-3 w-full cursor-pointer rounded border border-zinc-700 px-3 py-1.5 font-mono text-xs font-bold tracking-wider text-zinc-400 uppercase transition-colors hover:border-[#ef4444] hover:text-[#ef4444]"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
