"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

declare global {
  interface Window {
    solana?: { isPhantom?: boolean; connect?: () => Promise<{ publicKey?: { toString?: () => string } }> };
    phantom?: { solana?: { isPhantom?: boolean; connect?: () => Promise<{ publicKey?: { toString?: () => string } }> } };
    solflare?: { isSolflare?: boolean; connect?: () => Promise<void>; publicKey?: { toString?: () => string } };
    backpack?: { connect?: () => Promise<{ publicKey?: { toString?: () => string } }> };
  }
}

export type SolanaWalletId = "phantom" | "solflare" | "backpack";

export interface SolanaWalletOption {
  id: SolanaWalletId;
  name: string;
  icon: string;
  installUrl: string;
  detect: () => boolean;
}

export const SOLANA_WALLETS: SolanaWalletOption[] = [
  {
    id: "phantom",
    name: "Phantom",
    icon: "/wallets/phantom.svg",
    installUrl: "https://phantom.app/",
    detect: () => Boolean(typeof window !== "undefined" && (window.solana?.isPhantom || window.phantom?.solana?.isPhantom)),
  },
  {
    id: "solflare",
    name: "Solflare",
    icon: "/wallets/solflare.svg",
    installUrl: "https://solflare.com/",
    detect: () => Boolean(typeof window !== "undefined" && window.solflare?.isSolflare),
  },
  {
    id: "backpack",
    name: "Backpack",
    icon: "/wallets/backpack.svg",
    installUrl: "https://backpack.app/",
    detect: () => Boolean(typeof window !== "undefined" && window.backpack),
  },
];

interface WalletContextType {
  connected: boolean;
  address: string;
  walletName: string;
  walletIcon: string;
  shortAddress: string;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  connect: (wallet: SolanaWalletOption, addr: string) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const ADDR_KEY = "hoheee:wallet-address";
const NAME_KEY = "hoheee:wallet-name";
const ICON_KEY = "hoheee:wallet-icon";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [walletName, setWalletName] = useState("Phantom");
  const [walletIcon, setWalletIcon] = useState("/wallets/phantom.svg");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Restore wallet session on page reload (external store).
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
  useEffect(() => {
    try {
      const addr = localStorage.getItem(ADDR_KEY);
      if (addr) {
        setAddress(addr);
        setWalletName(localStorage.getItem(NAME_KEY) || "Phantom");
        setWalletIcon(localStorage.getItem(ICON_KEY) || "/wallets/phantom.svg");
        setConnected(true);
      }
    } catch {
      // private mode: ignore
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const connect = useCallback((wallet: SolanaWalletOption, addr: string) => {
    setConnected(true);
    setAddress(addr);
    setWalletName(wallet.name);
    setWalletIcon(wallet.icon);
    try {
      localStorage.setItem(ADDR_KEY, addr);
      localStorage.setItem(NAME_KEY, wallet.name);
      localStorage.setItem(ICON_KEY, wallet.icon);
    } catch {
      // private mode: ignore
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
    setAddress("");
    try {
      localStorage.removeItem(ADDR_KEY);
      localStorage.removeItem(NAME_KEY);
      localStorage.removeItem(ICON_KEY);
    } catch {
      // private mode: ignore
    }
  }, []);

  const shortAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "";

  return (
    <WalletContext.Provider value={{ connected, address, walletName, walletIcon, shortAddress, isModalOpen, setIsModalOpen, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
