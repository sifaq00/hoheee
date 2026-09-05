"use client";

import { useWallet } from "@/context/WalletContext";

export default function WalletButton() {
  const { connected, shortAddress, walletIcon, setIsModalOpen, disconnect } = useWallet();
  if (!connected) {
    return (
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="rounded border border-[#22c55e] px-3 py-1.5 text-sm font-semibold text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black"
      >
        Connect wallet
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={disconnect}
      title="Disconnect wallet"
      className="flex items-center gap-2 rounded border border-zinc-700 px-3 py-1.5 font-mono text-sm text-zinc-300 hover:border-[#ef4444] hover:text-[#ef4444]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static local svg, no optimizer needed */}
      <img src={walletIcon} alt="" width={18} height={18} />
      {shortAddress}
    </button>
  );
}
