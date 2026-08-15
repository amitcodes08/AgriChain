"use client";

import { BarnLeafIcon, SunIcon, WalletPlugIcon, FloatingLeaves } from "@/components/icons/CartoonIcons";
import { shortenAddress } from "@/lib/status";

/**
 * The header carries three things a farmer needs at a glance: who they are
 * looking at (the brand), whether the app can act on their behalf (the wallet
 * pill), and where the produce lives (the network badge).
 *
 * Wallet connection is deliberately simplified — one tap, one clear state. There
 * is no chain-switching UI to get lost in.
 */
export interface HeaderProps {
  wallet: string | null;
  connecting: boolean;
  farmerName?: string | null;
  network?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function Header({
  wallet,
  connecting,
  farmerName,
  network = "Polygon (local)",
  onConnect,
  onDisconnect,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-leaf-200/40 bg-white/60 backdrop-blur-2xl">
      {/* Animated gradient glow line at the very bottom of the header */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] animate-gradient-shift"
        style={{
          backgroundImage: "linear-gradient(90deg, transparent 5%, rgb(34 195 76 / 0.5) 25%, rgb(14 148 233 / 0.3) 50%, rgb(34 195 76 / 0.5) 75%, transparent 95%)",
          backgroundSize: "300% 100%",
        }}
        aria-hidden
      />

      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="group flex min-w-0 flex-1 items-center gap-3">
          <div className="medallion-glow grid h-14 w-14 shrink-0 place-items-center rounded-blob bg-white/90 shadow-glass backdrop-blur-sm">
            <BarnLeafIcon className="icon-hover h-10 w-10" />
          </div>

          <div className="min-w-0">
            <h1 className="flex items-center gap-1.5 truncate font-display text-xl font-extrabold leading-tight tracking-tight text-leaf-900 sm:text-2xl">
              AgriChain Trace
              <span className="inline-block animate-leaf-sway text-lg">🌿</span>
            </h1>
            <p className="truncate text-xs font-semibold text-leaf-700/80 sm:text-sm">
              {farmerName ? `Namaste, ${farmerName} 🌱` : "From seed to sale, fully traceable"}
            </p>
          </div>
        </div>

        {/* Network badge — hidden on the smallest screens where space is precious */}
        <div className="hidden items-center gap-2 rounded-full border border-sunny-200/50 bg-sunny-50/70 px-3 py-1.5 backdrop-blur-sm md:flex">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sunny-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sunny-500" />
          </span>
          <span className="font-display text-xs font-bold uppercase tracking-wide text-sunny-800">
            {network}
          </span>
        </div>

        {/* Wallet */}
        {wallet ? (
          <button
            type="button"
            onClick={onDisconnect}
            title="Tap to disconnect"
            className="group flex items-center gap-2.5 rounded-full border border-leaf-300/50 bg-white/70 py-1.5 pl-2 pr-4 shadow-glass backdrop-blur-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-glow-leaf active:scale-[0.97]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-leaf-100/80">
              <WalletPlugIcon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
            </span>
            <span className="text-left leading-tight">
              <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-leaf-600">
                Wallet Connected
              </span>
              <span className="block font-display text-sm font-extrabold text-leaf-900">
                {shortenAddress(wallet)}
              </span>
            </span>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf-400 opacity-40" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-leaf-500 ring-4 ring-leaf-200/50" />
            </span>
          </button>
        ) : (
          <button type="button" onClick={onConnect} disabled={connecting} className="btn-primary group py-2.5">
            <WalletPlugIcon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
            {connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        )}
      </div>
    </header>
  );
}
