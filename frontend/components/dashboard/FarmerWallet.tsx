"use client";

import { Panel, EmptyState, PanelSkeleton, ErrorNote } from "@/components/ui/Panel";
import { CoinBasketIcon, HandshakeCoinIcon, ScarecrowIcon, SparkleGroup } from "@/components/icons/CartoonIcons";
import { formatDateTime, formatTokens, shortenAddress } from "@/lib/status";
import type { TransactionStatus, TransactionType, WalletSummary } from "@/lib/types";

/** Money statuses get their own tiny vocabulary — pending money is not spent money. */
const TX_STATUS_STYLE: Record<TransactionStatus, { pill: string; label: string; dot: string }> = {
  PENDING: { pill: "bg-sunny-100/70 text-sunny-900 ring-sunny-300/50", label: "Pending", dot: "bg-sunny-400" },
  COMPLETED: { pill: "bg-leaf-100/70 text-leaf-800 ring-leaf-300/50", label: "Completed", dot: "bg-leaf-500" },
  FAILED: { pill: "bg-soil-100/70 text-soil-600 ring-soil-300/50", label: "Failed", dot: "bg-soil-400" },
};

const TX_TYPE_COPY: Record<TransactionType, string> = {
  SALE: "Sale",
  ESCROW: "Held in escrow",
  PAYOUT: "Paid out",
  REFUND: "Refunded",
};

export interface FarmerWalletProps {
  wallet: WalletSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/**
 * Farmer Wallet.
 *
 * Two numbers matter and they are shown at the same size: what is spendable now,
 * and what is locked in escrow until a buyer confirms delivery. Conflating the
 * two is the fastest way to lose a farmer's trust, so they never share a tile.
 */
export function FarmerWallet({ wallet, loading, error, onRetry }: FarmerWalletProps) {
  return (
    <Panel
      title="Farmer Wallet"
      subtitle="Your AgriToken balance and every payment, in one basket."
      Icon={CoinBasketIcon}
      accent="bg-sunny-100/80"
    >
      {error ? <ErrorNote message={error} onRetry={onRetry} /> : null}

      {loading && !wallet ? (
        <PanelSkeleton rows={4} />
      ) : !wallet ? (
        !error ? (
          <EmptyState
            Icon={ScarecrowIcon}
            title="No wallet yet"
            hint="Connect a wallet with a farmer profile to see your balance and payments."
          />
        ) : null
      ) : (
        <div className="space-y-5">
          {/* Balance hero */}
          <div className="relative overflow-hidden rounded-cartoon p-5 text-white shadow-glass-lg">
            {/* Gradient background with mesh texture */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, #22c34c 0%, #16a03a 40%, #157e31 70%, #0c436e 100%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 20%, rgb(255 255 255 / 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgb(255 255 255 / 0.1) 0%, transparent 40%)",
              }}
            />

            {/* Sparkle animation overlay */}
            <SparkleGroup count={6} />

            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-wide text-leaf-100">Available balance</p>
              <p className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
                {formatTokens(wallet.balance, wallet.currency)}
              </p>
              <p className="mt-1 font-mono text-xs font-bold text-leaf-100/80">
                {shortenAddress(wallet.walletAddress, 10, 8)}
              </p>
            </div>

            {/* A basket peeking out of the corner — gently floating */}
            <CoinBasketIcon
              className="pointer-events-none absolute -bottom-4 -right-3 h-32 w-32 animate-float-soft opacity-20"
              title=""
            />
          </div>

          {/* Pending vs lifetime */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-cartoon border border-sunny-200/40 bg-sunny-50/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:shadow-glass">
              <p className="text-xs font-bold uppercase tracking-wide text-sunny-700">In escrow</p>
              <p className="font-display text-2xl font-extrabold text-sunny-900">
                {formatTokens(wallet.pending, wallet.currency)}
              </p>
              <p className="text-xs font-semibold text-sunny-700">
                {wallet.counts.pending} payment{wallet.counts.pending === 1 ? "" : "s"} waiting on delivery
              </p>
            </div>

            <div className="rounded-cartoon border border-leaf-200/40 bg-leaf-50/50 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:shadow-glass">
              <p className="text-xs font-bold uppercase tracking-wide text-leaf-700">Earned so far</p>
              <p className="font-display text-2xl font-extrabold text-leaf-900">
                {formatTokens(wallet.lifetimeEarnings, wallet.currency)}
              </p>
              <p className="text-xs font-semibold text-leaf-700">
                across {wallet.counts.completed} completed sale{wallet.counts.completed === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {/* Ledger */}
          <div>
            <h3 className="mb-2 font-display text-base font-extrabold text-soil-800">
              Recent payments
            </h3>

            {wallet.transactions.length === 0 ? (
              <EmptyState
                Icon={HandshakeCoinIcon}
                title="No payments yet"
                hint="Once a buyer purchases a batch, the escrow and payout will show up here."
              />
            ) : (
              <ul className="space-y-2">
                {wallet.transactions.map((transaction) => {
                  const style = TX_STATUS_STYLE[transaction.status];
                  const outgoing = transaction.type === "REFUND";
                  const borderColor = transaction.status === "COMPLETED" ? "border-l-leaf-400" : transaction.status === "PENDING" ? "border-l-sunny-400" : "border-l-soil-300";

                  return (
                    <li
                      key={transaction._id}
                      className={`flex flex-wrap items-center gap-3 rounded-2xl border border-l-[3px] border-leaf-100/30 bg-white/50 px-3 py-2.5 backdrop-blur-sm transition-all duration-200 hover:scale-[1.01] hover:bg-white/70 hover:shadow-glass ${borderColor}`}
                    >
                      <span className={`h-3 w-3 shrink-0 rounded-full ${style.dot}`} aria-hidden />

                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-extrabold text-soil-800">
                          {TX_TYPE_COPY[transaction.type]}
                          {transaction.batchCode ? (
                            <span className="font-semibold text-soil-500"> · {transaction.batchCode}</span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs font-semibold text-soil-400">
                          {transaction.description ?? "—"} · {formatDateTime(transaction.occurredAt)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p
                          className={`font-display text-base font-extrabold ${
                            outgoing ? "text-soil-500" : "text-leaf-800"
                          }`}
                        >
                          {outgoing ? "−" : "+"}
                          {formatTokens(transaction.amount, transaction.currency)}
                        </p>
                        <span className={`pill ${style.pill} mt-0.5`}>{style.label}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
