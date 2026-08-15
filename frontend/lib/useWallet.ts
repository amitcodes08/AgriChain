"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Minimal EIP-1193 surface. Typing only what we use keeps this honest — the
 * dashboard genuinely needs nothing beyond account access.
 */
interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: never[]) => void) => void;
  removeListener?: (event: string, handler: (...args: never[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

const STORAGE_KEY = "agrichain.wallet";

/**
 * The demo account seeded by `backend/src/scripts/seed.ts` — Hardhat's second
 * signer. Without an injected wallet the dashboard still needs *someone* to be,
 * and a farmer evaluating the product should not have to install MetaMask first.
 */
export const DEMO_WALLET = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

export interface WalletState {
  address: string | null;
  connecting: boolean;
  /** True when the address came from an injected wallet rather than demo mode. */
  injected: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

/**
 * Wallet connection, deliberately simplified.
 *
 * If an injected wallet exists we ask it for accounts; if it does not, we fall
 * back to the seeded demo farmer so the dashboard is never a dead end. Either
 * way the rest of the app just sees an address.
 */
export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [injected, setInjected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore the previous session. Runs after mount so the server and client
  // render the same "disconnected" markup and hydration stays clean.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setAddress(saved.toLowerCase());
      setInjected(saved !== DEMO_WALLET);
    }
  }, []);

  // Follow account switches in the injected wallet.
  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on || !provider.removeListener) return;

    const handleAccountsChanged = (...args: never[]) => {
      const accounts = args[0] as unknown as string[] | undefined;
      const next = accounts?.[0]?.toLowerCase() ?? null;
      setAddress(next);
      setInjected(next != null);
      if (next) window.localStorage.setItem(STORAGE_KEY, next);
      else window.localStorage.removeItem(STORAGE_KEY);
    };

    provider.on("accountsChanged", handleAccountsChanged);
    return () => provider.removeListener?.("accountsChanged", handleAccountsChanged);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);

    try {
      const provider = window.ethereum;

      if (provider) {
        const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
        const account = accounts?.[0]?.toLowerCase();

        if (account) {
          setAddress(account);
          setInjected(true);
          window.localStorage.setItem(STORAGE_KEY, account);
          return;
        }
      }

      setAddress(DEMO_WALLET);
      setInjected(false);
      window.localStorage.setItem(STORAGE_KEY, DEMO_WALLET);
    } catch {
      // A rejected connection request is a choice, not a failure — say so gently
      // and leave the demo account available.
      setError("Wallet connection was cancelled. You can still explore with the demo farm account.");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setInjected(false);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { address, connecting, injected, error, connect, disconnect };
}
