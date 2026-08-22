"use client";

import { useEffect } from "react";
import { WalletPlugIcon, TractorIcon } from "@/components/icons/CartoonIcons";

export interface WalletModalProps {
  isOpen: boolean;
  connecting: boolean;
  isMetaMask: boolean;
  error: string | null;
  onClose: () => void;
  onConnectMetaMask: () => void;
  onConnectDemo: () => void;
}

export function WalletModal({
  isOpen,
  connecting,
  isMetaMask,
  error,
  onClose,
  onConnectMetaMask,
  onConnectDemo,
}: WalletModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-soil-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-cartoon border border-white/60 bg-white/95 p-6 shadow-glass-lg backdrop-blur-2xl sm:p-8 animate-scale-in">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-soil-400 hover:bg-soil-100 hover:text-soil-700 transition-colors"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-leaf-100/80 text-leaf-700">
            <WalletPlugIcon className="h-8 w-8" />
          </div>
          <h3 className="font-display text-2xl font-extrabold text-soil-900">
            Connect to AgriChain
          </h3>
          <p className="mt-1 text-sm font-semibold text-soil-500">
            Choose how you would like to interact with the farm ledger.
          </p>
        </div>

        {/* Error message */}
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {/* Options */}
        <div className="space-y-3">
          {/* Option 1: MetaMask / Web3 Wallet */}
          <button
            type="button"
            disabled={connecting}
            onClick={onConnectMetaMask}
            className="group relative flex w-full items-center gap-4 rounded-2xl border-2 border-leaf-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:border-leaf-500 hover:bg-leaf-50/50 hover:shadow-md active:scale-[0.99]"
          >
            {/* MetaMask Fox Icon SVG */}
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-50 border border-orange-200">
              <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none">
                <path d="m27.1 5.3-1.6 4.7L21 8.8l-1.3-4.1 7.4.6z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.5"/>
                <path d="m4.9 5.3 1.6 4.7L11 8.8l1.3-4.1-7.4.6z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.5"/>
                <path d="m23.4 20.8-2.6 3.9-5-1.5.7-2.3 6.9-.1z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.5"/>
                <path d="m8.6 20.8 2.6 3.9 5-1.5-.7-2.3-6.9-.1z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.5"/>
                <path d="m11.2 14.5-2.2 1.1.7 2.4 2.8-.2-1.3-3.3z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.5"/>
                <path d="m20.8 14.5 2.2 1.1-.7 2.4-2.8-.2 1.3-3.3z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.5"/>
                <path d="m11 8.8-4.5 1.2 2.7 7.9 2-3.4-.2-5.7z" fill="#E4761B"/>
                <path d="m21 8.8 4.5 1.2-2.7 7.9-2-3.4.2-5.7z" fill="#E4761B"/>
                <path d="m16 11.2-5 3.3.2 5.7 4.8 3.5 4.8-3.5.2-5.7-5-3.3z" fill="#F6851B"/>
                <path d="m16 23.7-4.8-3.5-.7 2.3 2.6 3.9 2.9-2.7z" fill="#C0AD9E"/>
                <path d="m16 23.7 4.8-3.5.7 2.3-2.6 3.9-2.9-2.7z" fill="#161616"/>
                <path d="m16 11.2 5-3.3 1.3 4.1-6.3-.8z" fill="#763D16"/>
                <path d="m16 11.2-5-3.3-1.3 4.1 6.3-.8z" fill="#763D16"/>
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-base font-extrabold text-soil-900">
                  MetaMask / Web3 Wallet
                </h4>
                <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-[0.65rem] font-bold text-leaf-800 uppercase">
                  Polygon Amoy
                </span>
              </div>
              <p className="text-xs font-semibold text-soil-500">
                {isMetaMask
                  ? "Connect your browser wallet to sign real transactions on Polygon."
                  : "Connect with injected wallet extension (MetaMask, Rabby, etc.)"}
              </p>
            </div>
          </button>

          {/* Option 2: Demo Farm Account */}
          <button
            type="button"
            disabled={connecting}
            onClick={onConnectDemo}
            className="group relative flex w-full items-center gap-4 rounded-2xl border-2 border-sunny-200 bg-sunny-50/50 p-4 text-left shadow-sm transition-all duration-200 hover:border-sunny-400 hover:bg-sunny-100/60 hover:shadow-md active:scale-[0.99]"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sunny-100 border border-sunny-300">
              <TractorIcon className="h-8 w-8" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-base font-extrabold text-soil-900">
                  Demo Farm Account (Anita Deshmukh)
                </h4>
                <span className="rounded-full bg-sunny-200 px-2 py-0.5 text-[0.65rem] font-bold text-sunny-900 uppercase">
                  Instant Test
                </span>
              </div>
              <p className="text-xs font-semibold text-soil-500">
                Explore 5 pre-loaded crop batches, escrow balance & live transit tracking without installing a wallet.
              </p>
            </div>
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-6 border-t border-soil-100 pt-4 text-center">
          <p className="text-[0.7rem] font-semibold text-soil-400">
            🌱 AgriChain Trace is deployed on Polygon Amoy Testnet (Chain ID: 80002).
          </p>
        </div>
      </div>
    </div>
  );
}
