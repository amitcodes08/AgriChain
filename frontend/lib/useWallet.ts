"use client";

import { useCallback, useEffect, useState } from "react";

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, handler: (...args: never[]) => void) => void;
  removeListener?: (event: string, handler: (...args: never[]) => void) => void;
  isMetaMask?: boolean;
  providers?: Eip1193Provider[];
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

/**
 * Safely resolves the exact MetaMask provider even when multiple wallet extensions are installed.
 */
function getMetaMaskProvider(): Eip1193Provider | undefined {
  if (typeof window === "undefined" || !window.ethereum) return undefined;

  const eth = window.ethereum;

  // Handle multi-wallet setups (e.g. MetaMask + Phantom + Coinbase)
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    const mm = eth.providers.find((p) => p.isMetaMask && !("isPhantom" in p) && !("isBraveWallet" in p));
    if (mm) return mm;
    const anyMm = eth.providers.find((p) => p.isMetaMask);
    if (anyMm) return anyMm;
  }

  return eth;
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
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

  // Check provider on mount
  useEffect(() => {
    const provider = getMetaMaskProvider();
    if (provider) {
      setIsMetaMask(Boolean(provider.isMetaMask ?? true));
      void provider
        .request({ method: "eth_chainId" })
        .then((id) => {
          if (typeof id === "string") setChainId(parseInt(id, 16));
        })
        .catch(() => undefined);
    }
  }, []);

  // Restore saved session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setAddress(saved.toLowerCase());
      setInjected(saved.toLowerCase() !== DEMO_WALLET.toLowerCase());
    }
  }, []);

  // Listen to accounts & chain changes
  useEffect(() => {
    const provider = getMetaMaskProvider();
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
      if (hexId) setChainId(parseInt(hexId, 16));
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const switchToAmoy = useCallback(async () => {
    const provider = getMetaMaskProvider();
    if (!provider) return;

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: AMOY_CHAIN_ID_HEX }],
      });
      setChainId(AMOY_CHAIN_ID_DEC);
    } catch (switchError: unknown) {
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

    const provider = getMetaMaskProvider();
    if (!provider) {
      setError("MetaMask extension was not detected in this browser. You can click 'Explore Demo Account' below to test immediately!");
      setConnecting(false);
      return;
    }

    try {
      // 1. First check if accounts are already unlocked/authorized
      let accounts = (await provider.request({ method: "eth_accounts" }).catch(() => [])) as string[];

      // 2. If not yet connected, request accounts with a timeout race
      if (!accounts || accounts.length === 0) {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("METAMASK_TIMEOUT")), 12000)
        );

        const requestPromise = provider.request({ method: "eth_requestAccounts" }) as Promise<string[]>;

        try {
          accounts = await Promise.race([requestPromise, timeoutPromise]);
        } catch (raceErr: unknown) {
          if (raceErr instanceof Error && raceErr.message === "METAMASK_TIMEOUT") {
            setError(
              "🦊 MetaMask notification is waiting! Please click the MetaMask extension icon in your browser toolbar to approve, or click 'Explore Demo Account' below."
            );
            setConnecting(false);
            return;
          }
          throw raceErr;
        }
      }

      const account = accounts?.[0]?.toLowerCase();

      if (account) {
        setAddress(account);
        setInjected(true);
        window.localStorage.setItem(STORAGE_KEY, account);

        // Check network
        const currentChainHex = (await provider.request({ method: "eth_chainId" }).catch(() => null)) as string | null;
        if (currentChainHex) {
          const currentDec = parseInt(currentChainHex, 16);
          setChainId(currentDec);
          if (currentDec !== AMOY_CHAIN_ID_DEC) {
            void switchToAmoy();
          }
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { code?: number; message?: string };
      if (errorObj?.code === 4001) {
        setError("MetaMask connection request was cancelled. You can try again or use the Demo Account.");
      } else if (errorObj?.code === -32002) {
        setError("A connection request is already pending in MetaMask. Please click your MetaMask extension icon to approve.");
      } else {
        setError(errorObj?.message || "Failed to connect to MetaMask. Please check your browser extension.");
      }
    } finally {
      setConnecting(false);
    }
  }, [switchToAmoy]);

  const connectDemo = useCallback(() => {
    setConnecting(false);
    setAddress(DEMO_WALLET);
    setInjected(false);
    setError(null);
    window.localStorage.setItem(STORAGE_KEY, DEMO_WALLET);
  }, []);

  const disconnect = useCallback(() => {
    setConnecting(false);
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


