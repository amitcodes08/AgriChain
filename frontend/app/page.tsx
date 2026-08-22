"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { WalletModal } from "@/components/layout/WalletModal";
import { RegisterBatchForm } from "@/components/dashboard/RegisterBatchForm";
import { BatchList } from "@/components/dashboard/BatchList";
import { FarmerWallet } from "@/components/dashboard/FarmerWallet";
import { TraceabilityMap } from "@/components/dashboard/TraceabilityMap";
import { StatTile } from "@/components/ui/Panel";
import {
  GrowingPlantFieldIcon,
  HandshakeCoinIcon,
  RobotInspectIcon,
  SunIcon,
  TractorIcon,
  ChainLinkIcon,
  GlobeTruckLeafIcon,
  FloatingLeaves,
  SparkleGroup,
} from "@/components/icons/CartoonIcons";
import {
  ApiError,
  assessBatch,
  getBatchStats,
  getBatches,
  getFarmer,
  getTraceMap,
  getWallet,
  updateBatchStatus,
} from "@/lib/api";
import { NEXT_STATUS, formatNumber, formatTokens } from "@/lib/status";
import { useWallet } from "@/lib/useWallet";
import type { Batch, BatchStats, Farmer, TraceMap, WalletSummary } from "@/lib/types";

/**
 * The Farmer Dashboard.
 */
export default function DashboardPage() {
  const wallet = useWallet();
  const address = wallet.address;

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<BatchStats | null>(null);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [traceMap, setTraceMap] = useState<TraceMap | null>(null);

  const [loading, setLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [busyBatchId, setBusyBatchId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /** Pulls everything the dashboard shows for one farmer. */
  const loadAll = useCallback(async (walletAddress: string) => {
    setLoading(true);
    setBatchError(null);
    setWalletError(null);
    setMapError(null);

    // Each module fails on its own — a missing farmer profile should not blank
    // out the batch list.
    const [batchResult, statsResult, farmerResult, walletResult, mapResult] = await Promise.allSettled([
      getBatches({ farmerWallet: walletAddress, limit: 50 }),
      getBatchStats(walletAddress),
      getFarmer(walletAddress),
      getWallet(walletAddress),
      getTraceMap(walletAddress),
    ]);

    if (batchResult.status === "fulfilled") setBatches(batchResult.value.data);
    else setBatchError(messageOf(batchResult.reason));

    if (statsResult.status === "fulfilled") setStats(statsResult.value);
    if (farmerResult.status === "fulfilled") setFarmer(farmerResult.value);

    if (walletResult.status === "fulfilled") setWalletSummary(walletResult.value);
    else setWalletError(messageOf(walletResult.reason));

    if (mapResult.status === "fulfilled") setTraceMap(mapResult.value);
    else setMapError(messageOf(mapResult.reason));

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!address) {
      setFarmer(null);
      setBatches([]);
      setStats(null);
      setWalletSummary(null);
      setTraceMap(null);
      return;
    }
    void loadAll(address);
  }, [address, loadAll]);

  // Toasts are transient acknowledgements, not a log — they clear themselves.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const refresh = useCallback(() => {
    if (address) void loadAll(address);
  }, [address, loadAll]);

  /** Moves a batch one step along its lifecycle. */
  const handleAdvance = useCallback(
    async (batch: Batch) => {
      const next = NEXT_STATUS[batch.status];
      if (!next) return;

      setBusyBatchId(batch._id);
      setBatchError(null);

      try {
        const updated = await updateBatchStatus({ batchId: batch._id, status: next });
        setBatches((current) => current.map((item) => (item._id === updated._id ? updated : item)));
        setToast(`${updated.batchCode} is now ${updated.status.replace(/_/g, " ").toLowerCase()}.`);

        // Money and location both move with the status, so re-read them.
        if (address) {
          const [walletResult, mapResult, statsResult] = await Promise.allSettled([
            getWallet(address),
            getTraceMap(address),
            getBatchStats(address),
          ]);
          if (walletResult.status === "fulfilled") setWalletSummary(walletResult.value);
          if (mapResult.status === "fulfilled") setTraceMap(mapResult.value);
          if (statsResult.status === "fulfilled") setStats(statsResult.value);
        }
      } catch (caught) {
        setBatchError(messageOf(caught));
      } finally {
        setBusyBatchId(null);
      }
    },
    [address],
  );

  /** Re-runs the AI quality check on an existing batch. */
  const handleReassess = useCallback(async (batch: Batch) => {
    setBusyBatchId(batch._id);
    setBatchError(null);

    try {
      const updated = await assessBatch(batch._id);
      setBatches((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      setToast(
        updated.qualityReport
          ? `${updated.batchCode} scored ${updated.qualityReport.qualityScore}/100.`
          : `${updated.batchCode} was re-checked.`,
      );
    } catch (caught) {
      setBatchError(messageOf(caught));
    } finally {
      setBusyBatchId(null);
    }
  }, []);

  const handleRegistered = useCallback(
    (batch: Batch) => {
      setBatches((current) => [batch, ...current]);
      setToast(`${batch.batchCode} planted in the ledger.`);
      // The new batch shifts the stats and puts a fresh pin on the map.
      if (address) {
        void getBatchStats(address).then(setStats).catch(() => undefined);
        void getTraceMap(address).then(setTraceMap).catch(() => undefined);
      }
    },
    [address],
  );

  return (
    <div className="min-h-screen relative">
      {/* Ambient floating leaves */}
      <FloatingLeaves count={6} />

      <Header
        wallet={address}
        connecting={wallet.connecting}
        injected={wallet.injected}
        isCorrectNetwork={wallet.isCorrectNetwork}
        farmerName={farmer?.name}
        onConnect={() => setIsWalletModalOpen(true)}
        onDisconnect={wallet.disconnect}
        onSwitchNetwork={() => void wallet.switchToAmoy()}
      />

      <WalletModal
        isOpen={isWalletModalOpen}
        connecting={wallet.connecting}
        isMetaMask={wallet.isMetaMask}
        error={wallet.error}
        onClose={() => {
          setIsWalletModalOpen(false);
          wallet.clearError();
        }}
        onConnectMetaMask={async () => {
          await wallet.connectMetaMask();
          setIsWalletModalOpen(false);
        }}
        onConnectDemo={() => {
          wallet.connectDemo();
          setIsWalletModalOpen(false);
        }}
      />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {address ? (
          <>
            <FarmSummary farmer={farmer} stats={stats} />

            <div className="divider-glow" />

            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-5">
                <div className="stagger-1 animate-fade-in-up">
                  <RegisterBatchForm wallet={address} onRegistered={handleRegistered} />
                </div>
                <div className="stagger-2 animate-fade-in-up">
                  <FarmerWallet
                    wallet={walletSummary}
                    loading={loading}
                    error={walletError}
                    onRetry={refresh}
                  />
                </div>
              </div>

              <div className="space-y-6 lg:col-span-7">
                <div className="stagger-3 animate-fade-in-up">
                  <BatchList
                    batches={batches}
                    loading={loading}
                    error={batchError}
                    busyBatchId={busyBatchId}
                    onRefresh={refresh}
                    onAdvance={handleAdvance}
                    onReassess={handleReassess}
                  />
                </div>
                <div className="stagger-4 animate-fade-in-up">
                  <TraceabilityMap map={traceMap} loading={loading} error={mapError} onRetry={refresh} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <WelcomeScreen
            connecting={wallet.connecting}
            error={wallet.error}
            onConnectMetaMask={() => void wallet.connectMetaMask()}
            onConnectDemo={wallet.connectDemo}
          />
        )}
      </main>

      <footer className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-2 sm:px-6 lg:px-8">
        <div className="rounded-cartoon border border-white/50 bg-white/40 px-6 py-4 text-center backdrop-blur-sm">
          <p className="font-accent text-sm italic text-soil-500">
            <span className="inline-block animate-leaf-sway">🍃</span>
            {" "}&ldquo;Every grain tells a story — trace yours.&rdquo;{" "}
            <span className="inline-block animate-leaf-sway" style={{ animationDelay: "1s" }}>🌿</span>
          </p>
          <p className="mt-1 text-xs font-bold text-soil-400">
            <span
              className="bg-clip-text font-display font-extrabold text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #22c34c 0%, #0e94e9 100%)" }}
            >
              AgriChain Trace
            </span>{" "}
            · every batch minted as an NFT, every payment held in escrow until delivery.
          </p>
        </div>
      </footer>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 animate-scale-in rounded-cartoon border border-white/40 px-4 py-3 text-center font-display text-sm font-extrabold text-white shadow-glass-lg backdrop-blur-xl"
          style={{ background: "linear-gradient(135deg, rgb(34 195 76 / 0.92) 0%, rgb(22 160 58 / 0.95) 100%)" }}
        >
          <span className="mr-1.5">🌱</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}

/** Turns any thrown value into something worth showing a farmer. */
function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

/** The at-a-glance strip above the modules. */
function FarmSummary({ farmer, stats }: { farmer: Farmer | null; stats: BatchStats | null }) {
  return (
    <section className="card-cartoon animate-scale-in overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="medallion-glow group relative grid h-20 w-20 shrink-0 place-items-center rounded-blob bg-leaf-100/70 shadow-glass backdrop-blur-sm">
          {/* Animated sun rays behind the tractor */}
          <div className="sun-rays-bg -inset-3" />
          <TractorIcon className="icon-hover relative z-10 h-14 w-14" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-extrabold leading-tight text-soil-900 sm:text-3xl">
            {farmer ? `${farmer.name}'s farm` : "Your farm"}
          </h2>
          <p className="text-sm font-semibold text-soil-500">
            {farmer?.displayLocation || "Your harvest, your ledger"}
            {farmer?.farmSizeAcres ? ` · ${farmer.farmSizeAcres} acres` : ""}
          </p>
        </div>

        <SunIcon className="hidden h-14 w-14 animate-sun-pulse sm:block" title="" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Growing now"
          value={formatNumber(stats?.activeBatches ?? 0)}
          sublabel="batches in the field"
          tone="leaf"
        />
        <StatTile
          label="On the road"
          value={formatNumber(stats?.inTransit ?? 0)}
          sublabel="heading to buyers"
          tone="earth"
        />
        <StatTile
          label="Total harvest"
          value={`${formatNumber(stats?.totalKg ?? 0)} kg`}
          sublabel="registered all time"
          tone="sunny"
        />
        <StatTile
          label="Ledger value"
          value={formatTokens(stats?.totalValue ?? 0)}
          sublabel={stats?.avgQuality ? `avg quality ${stats.avgQuality}/100` : "across all batches"}
          tone="sky"
        />
      </div>
    </section>
  );
}

/** Shown before a wallet is connected — the hero experience. */
function WelcomeScreen({
  connecting,
  error,
  onConnectMetaMask,
  onConnectDemo,
}: {
  connecting: boolean;
  error: string | null;
  onConnectMetaMask: () => void;
  onConnectDemo: () => void;
}) {
  return (
    <div className="mt-4 space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-cartoon border border-white/40 p-8 text-center shadow-glass-lg backdrop-blur-xl sm:p-12">
        {/* Animated gradient background */}
        <div
          className="pointer-events-none absolute inset-0 animate-gradient-shift opacity-90"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgb(240 253 242 / 0.9) 0%, rgb(220 252 227 / 0.8) 25%, rgb(255 252 235 / 0.7) 50%, rgb(224 240 254 / 0.8) 75%, rgb(240 253 242 / 0.9) 100%)",
            backgroundSize: "300% 300%",
          }}
        />

        {/* Floating dot pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, rgb(34 195 76 / 0.15) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10">
          <div className="mx-auto flex w-fit items-end gap-3">
            <GrowingPlantFieldIcon className="h-14 w-14 animate-float-soft sm:h-16 sm:w-16" />
            <TractorIcon className="h-20 w-20 sm:h-24 sm:w-24" />
            <HandshakeCoinIcon className="h-14 w-14 animate-float-soft sm:h-16 sm:w-16" />
          </div>

          <h2 className="mt-6 font-display text-3xl font-extrabold text-soil-900 sm:text-4xl lg:text-5xl">
            Welcome to{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #22c34c 0%, #16a03a 50%, #0e94e9 100%)" }}
            >
              AgriChain Trace
            </span>
          </h2>

          <p className="mx-auto mt-3 max-w-xl font-accent text-base italic text-soil-600 sm:text-lg">
            From seed to sale, every step verified on chain.
          </p>

          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-soil-500">
            Register a harvest, get an instant AI quality grade, and watch your produce travel to the buyer — with
            the payment safely held in escrow until it arrives.
          </p>

          {/* Action Choice Buttons */}
          <div className="mx-auto mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg">
            {/* MetaMask Connect Button */}
            <button
              type="button"
              onClick={onConnectMetaMask}
              disabled={connecting}
              className="btn-primary group w-full sm:w-auto animate-glow-pulse px-6 py-3.5 text-base flex items-center justify-center gap-3"
            >
              <svg viewBox="0 0 32 32" className="h-6 w-6 shrink-0" fill="none">
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
              <span>{connecting ? "Opening MetaMask…" : "Connect with MetaMask"}</span>
            </button>

            {/* Demo Account Button */}
            <button
              type="button"
              onClick={onConnectDemo}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-full border-2 border-sunny-300 bg-sunny-100/90 px-6 py-3 text-base font-extrabold text-sunny-900 shadow-glass transition-all duration-200 hover:scale-[1.03] hover:bg-sunny-200 hover:shadow-glow-sunny active:scale-[0.97]"
            >
              <TractorIcon className="h-6 w-6 shrink-0" />
              <span>Explore Demo Account</span>
            </button>
          </div>

          <p className="mt-4 text-xs font-semibold text-soil-400">
            Deployed on Polygon Amoy Testnet · One-click demo available with Anita Deshmukh&apos;s farm.
          </p>

          {error ? (
            <p className="mx-auto mt-4 max-w-md rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 shadow-sm">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <FeatureCard
          Icon={RobotInspectIcon}
          title="AI Quality Grading"
          tagline="Instant, objective, on-chain"
          description="Drop a photo and our AI inspector scores ripeness, moisture, and defects in seconds."
          tone="sky"
          delay="stagger-1"
        />
        <FeatureCard
          Icon={ChainLinkIcon}
          title="Blockchain Escrow"
          tagline="Trust built into the transaction"
          description="Every payment is locked in escrow until the buyer confirms delivery. No middlemen, no disputes."
          tone="leaf"
          delay="stagger-2"
        />
        <FeatureCard
          Icon={GlobeTruckLeafIcon}
          title="Live Traceability"
          tagline="From your field to their table"
          description="Track every batch on a live map from harvest origin to buyer destination, with full history."
          tone="sunny"
          delay="stagger-3"
        />
      </section>
    </div>
  );
}

function FeatureCard({
  Icon,
  title,
  tagline,
  description,
  tone,
  delay,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  tagline: string;
  description: string;
  tone: "leaf" | "sky" | "sunny";
  delay: string;
}) {
  const tones = {
    leaf: "border-leaf-200/40 hover:shadow-glow-leaf",
    sky: "border-sky-200/40 hover:shadow-glow-sky",
    sunny: "border-sunny-200/40 hover:shadow-glow-sunny",
  } as const;

  const accents = {
    leaf: "bg-leaf-100/60",
    sky: "bg-sky-100/60",
    sunny: "bg-sunny-100/60",
  } as const;

  return (
    <div
      className={`${delay} group animate-fade-in-up rounded-cartoon border bg-white/50 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/70 ${tones[tone]}`}
    >
      <div className={`mb-4 inline-flex rounded-blob ${accents[tone]} p-3 shadow-glass backdrop-blur-sm`}>
        <Icon className="h-10 w-10 transition-transform duration-300 group-hover:scale-110" />
      </div>
      <h3 className="font-display text-lg font-extrabold text-soil-900">{title}</h3>
      <p className="mt-0.5 text-sm font-semibold text-soil-500">{tagline}</p>
      <p className="mt-2 text-sm font-semibold text-soil-600">{description}</p>
    </div>
  );
}
