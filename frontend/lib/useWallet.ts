"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Minimal EIP-1193 surface.
 */
interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, handler: (...args: never[]) => void) => void;
  removeListener?: (event: string, handler: (...args: never[]) => void) => void;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

const STORAGE_KEY = "agrichain.wallet";
const AMOY_CHAIN_ID_HEX = "0x13882"; // 80002 in hex
const AMOY_CHAIN_ID_DEC = 80002;

/**
 * Pre-seeded demo account from backend seed script (Anita Deshmukh).
 */
export const DEMO_WALLET = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

export interface WalletState {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  /** True when the address came from an injected wallet rather than demo mode. */
  injected: boolean;
  isMetaMask: boolean;
  isCorrectNetwork: boolean;
  error: string | null;
  connectMetaMask: () => Promise<void>;
  connectDemo: () => void;
  switchToAmoy: () => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [injected, setInjected] = useState(false);
  const [isMetaMask, setIsMetaMask] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if MetaMask / Injected provider exists on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      setIsMetaMask(Boolean(window.ethereum.isMetaMask ?? true));
      void window.ethereum.request({ method: "eth_chainId" }).then((id) => {
        if (typeof id === "string") {
          setChainId(parseInt(id, 16));
        }
      }).catch(() => undefined);
    }
  }, []);

  // Restore the previous session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setAddress(saved.toLowerCase());
      setInjected(saved.toLowerCase() !== DEMO_WALLET.toLowerCase());
    }
  }, []);

  // Listen to accounts and chain changes in injected wallet
  useEffect(() => {
    const provider = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!provider?.on || !provider.removeListener) return;

    const handleAccountsChanged = (...args: never[]) => {
      const accounts = args[0] as unknown as string[] | undefined;
      const next = accounts?.[0]?.toLowerCase() ?? null;
      if (next) {
        setAddress(next);
        setInjected(true);
        window.localStorage.setItem(STORAGE_KEY, next);
      } else {
        setAddress(null);
        setInjected(false);
        window.localStorage.removeItem(STORAGE_KEY);
      }
    };

    const handleChainChanged = (...args: never[]) => {
      const hexId = args[0] as unknown as string | undefined;
      if (hexId) {
        setChainId(parseInt(hexId, 16));
      }
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const switchToAmoy = useCallback(async () => {
    const provider = window.ethereum;
    if (!provider) return;

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: AMOY_CHAIN_ID_HEX }],
      });
      setChainId(AMOY_CHAIN_ID_DEC);
    } catch (switchError: unknown) {
      // 4902 indicates chain not added to wallet yet
      const errorObj = switchError as { code?: number };
      if (errorObj?.code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: AMOY_CHAIN_ID_HEX,
                chainName: "Polygon Amoy Testnet",
                nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
                rpcUrls: ["https://polygon-amoy-bor-rpc.publicnode.com"],
                blockExplorerUrls: ["https://amoy.polygonscan.com/"],
              },
            ],
          });
          setChainId(AMOY_CHAIN_ID_DEC);
        } catch {
          setError("Failed to add Polygon Amoy network to MetaMask.");
        }
      }
    }
  }, []);

  const connectMetaMask = useCallback(async () => {
    setConnecting(true);
    setError(null);

    const provider = window.ethereum;
    if (!provider) {
      setError("MetaMask is not installed. Please install MetaMask extension or use the Demo Farm Account.");
      setConnecting(false);
      return;
    }

    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const account = accounts?.[0]?.toLowerCase();

      if (account) {
        setAddress(account);
        setInjected(true);
        window.localStorage.setItem(STORAGE_KEY, account);

        // Check and prompt network switch if not on Amoy
        const currentChainHex = (await provider.request({ method: "eth_chainId" })) as string;
        const currentDec = parseInt(currentChainHex, 16);
        setChainId(currentDec);

        if (currentDec !== AMOY_CHAIN_ID_DEC) {
          void switchToAmoy();
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { code?: number; message?: string };
      if (errorObj?.code === 4001) {
        setError("Connection rejected in MetaMask. You can try again or use the Demo Account.");
      } else {
        setError(errorObj?.message || "Failed to connect to MetaMask.");
      }
    } finally {
      setConnecting(false);
    }
  }, [switchToAmoy]);

  const connectDemo = useCallback(() => {
    setAddress(DEMO_WALLET);
    setInjected(false);
    setError(null);
    window.localStorage.setItem(STORAGE_KEY, DEMO_WALLET);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setInjected(false);
    setError(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const isCorrectNetwork = !injected || chainId === AMOY_CHAIN_ID_DEC;

  return {
    address,
    chainId,
    connecting,
    injected,
    isMetaMask,
    isCorrectNetwork,
    error,
    connectMetaMask,
    connectDemo,
    switchToAmoy,
    disconnect,
    clearError,
  };
}

