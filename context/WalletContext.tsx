"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

declare global {
  interface Window {
    solana?: { isPhantom?: boolean; connect?: () => Promise<{ publicKey?: { toString?: () => string } }> };
    phantom?: { solana?: { isPhantom?: boolean; connect?: () => Promise<{ publicKey?: { toString?: () => string } }> } };
    solflare?: { isSolflare?: boolean; connect?: () => Promise<void>; publicKey?: { toString?: () => string } };
    backpack?: { connect?: () => Promise<{ publicKey?: { toString?: () => string } }> };
    nightly?: { solana?: { connect?: () => Promise<{ publicKey?: { toString?: () => string } }> } };
    ethereum?: { request?: (args: { method: string }) => Promise<unknown> };
    okxwallet?: { request?: (args: { method: string }) => Promise<unknown> };
    coinbaseWalletExtension?: { request?: (args: { method: string }) => Promise<unknown> };
    trustwallet?: { request?: (args: { method: string }) => Promise<unknown> };
    bitkeep?: { ethereum?: { request?: (args: { method: string }) => Promise<unknown> } };
  }
}

export type SolanaWalletId = "phantom" | "solflare" | "backpack" | "nightly";
export type EvmWalletId = "metamask" | "coinbase" | "okx" | "trust" | "bitkeep";

export interface SolanaWalletOption {
  id: SolanaWalletId;
  name: string;
  icon: string | null;
  installUrl: string;
  detect: () => boolean;
}

export interface EvmWalletOption {
  id: EvmWalletId;
  name: string;
  icon: string | null;
  installUrl: string;
  detect: () => boolean;
}

export type WalletOption = SolanaWalletOption | EvmWalletOption;

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
  {
    id: "nightly",
    name: "Nightly",
    icon: "/wallets/nightly.svg",
    installUrl: "https://nightly.app/",
    detect: () => Boolean(typeof window !== "undefined" && window.nightly?.solana),
  },
];

export const EVM_WALLETS: EvmWalletOption[] = [
  {
    id: "metamask",
    name: "MetaMask",
    icon: "/wallets/metamask.svg",
    installUrl: "https://metamask.io/",
    detect: () => Boolean(typeof window !== "undefined" && window.ethereum?.request),
  },
  {
    id: "coinbase",
    name: "Coinbase",
    icon: "/wallets/coinbase.svg",
    installUrl: "https://www.coinbase.com/wallet",
    detect: () => Boolean(typeof window !== "undefined" && window.coinbaseWalletExtension?.request),
  },
  {
    id: "okx",
    name: "OKX",
    icon: "/wallets/okx.svg",
    installUrl: "https://www.okx.com/web3",
    detect: () => Boolean(typeof window !== "undefined" && window.okxwallet?.request),
  },
  {
    id: "trust",
    name: "Trust",
    icon: "/wallets/trust.svg",
    installUrl: "https://trustwallet.com/",
    detect: () => Boolean(typeof window !== "undefined" && window.trustwallet?.request),
  },
  {
    id: "bitkeep",
    name: "Bitget",
    icon: null,
    installUrl: "https://web3.bitget.com/",
    detect: () => Boolean(typeof window !== "undefined" && window.bitkeep?.ethereum?.request),
  },
];

interface WalletContextType {
  connected: boolean;
  address: string;
  walletName: string;
  walletIcon: string | null;
  shortAddress: string;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  connect: (wallet: WalletOption, addr: string) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const ADDR_KEY = "aries:wallet-address";
const NAME_KEY = "aries:wallet-name";
const ICON_KEY = "aries:wallet-icon";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [walletName, setWalletName] = useState("Phantom");
  const [walletIcon, setWalletIcon] = useState<string | null>("/wallets/phantom.svg");
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

  const connect = useCallback((wallet: WalletOption, addr: string) => {
    setConnected(true);
    setAddress(addr);
    setWalletName(wallet.name);
    setWalletIcon(wallet.icon);
    try {
      localStorage.setItem(ADDR_KEY, addr);
      localStorage.setItem(NAME_KEY, wallet.name);
      if (wallet.icon) localStorage.setItem(ICON_KEY, wallet.icon);
      else localStorage.removeItem(ICON_KEY);
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
