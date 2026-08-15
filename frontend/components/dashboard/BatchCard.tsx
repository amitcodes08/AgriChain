"use client";

import { useState } from "react";
import { BatchTimeline, TimelineLog } from "./BatchTimeline";
import { StatusMedallion } from "@/components/ui/StatusPill";
import { ChainLinkIcon, QualityBadgeIcon, RobotInspectIcon } from "@/components/icons/CartoonIcons";
import {
  ADVANCE_LABEL,
  CROP_EMOJI,
  NEXT_STATUS,
  STATUS_META,
  formatDate,
  formatNumber,
  formatTokens,
  gradeClasses,
  shortenAddress,
} from "@/lib/status";
import type { Batch } from "@/lib/types";

/** Status → left-border accent colour for visual status identification. */
const STATUS_BORDER: Record<string, string> = {
  PLANTED: "border-l-leaf-400",
  AI_VERIFIED: "border-l-sky-400",
  LISTED: "border-l-sunny-400",
  IN_TRANSIT: "border-l-earth-400",
  SOLD: "border-l-leaf-600",
  CANCELLED: "border-l-soil-300",
};

export interface BatchCardProps {
  batch: Batch;
  busy: boolean;
  onAdvance: (batch: Batch) => void;
  onReassess: (batch: Batch) => void;
}

/**
 * One crop batch, as a card.
 *
 * The card answers the three questions a farmer actually has — what is it, where
 * is it in its journey, and what can I do next — before any of the blockchain
 * detail, which stays folded away behind "Show details".
 */
export function BatchCard({ batch, busy, onAdvance, onReassess }: BatchCardProps) {
  const [expanded, setExpanded] = useState(false);

  const meta = STATUS_META[batch.status];
  const next = NEXT_STATUS[batch.status];
  const advanceLabel = ADVANCE_LABEL[batch.status];
  const report = batch.qualityReport;
  const minted = Boolean(batch.chain?.tokenId);
  const borderAccent = STATUS_BORDER[batch.status] ?? "border-l-leaf-200";

  return (
    <article
      className={`card-cartoon animate-fade-in-up overflow-hidden border-l-[3px] p-4 transition-all duration-300 hover:shadow-glass-lg sm:p-5 ${borderAccent}`}
    >
      {/* Header line: identity + status */}
      <div className="flex flex-wrap items-start gap-3">
        <StatusMedallion status={batch.status} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-extrabold leading-tight text-soil-900">
              {batch.batchCode}
            </h3>
            {minted ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-sky-200/50 bg-sky-100/60 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-sky-800 backdrop-blur-sm"
                title={`Token #${batch.chain?.tokenId} on chain`}
              >
                <ChainLinkIcon className="h-4 w-4" />
                NFT #{batch.chain?.tokenId}
              </span>
            ) : null}
          </div>

          <p className="text-sm font-bold text-soil-600">
            <span aria-hidden>{CROP_EMOJI[batch.cropType] ?? "🌱"}</span> {batch.cropType} ·{" "}
            {formatNumber(batch.quantityKg)} kg
          </p>
          <p className="text-xs font-semibold text-soil-400">Registered {formatDate(batch.createdAt)}</p>
        </div>

        <div className="text-right">
          <p className="font-display text-xl font-extrabold leading-tight text-leaf-800">
            {formatTokens(batch.totalValue, batch.currency)}
          </p>
          <p className="text-xs font-semibold text-soil-400">
            {formatTokens(batch.pricePerKg, batch.currency)} / kg
          </p>
        </div>
      </div>

      {/* Status sentence — plain language, no jargon */}
      <p className={`mt-3 rounded-2xl border border-white/40 px-3 py-2 text-sm font-semibold backdrop-blur-sm ${meta.medallion} text-soil-700`}>
        {meta.description}
      </p>

      {/* Quality strip */}
      {report ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-leaf-100/50 bg-leaf-50/50 px-3 py-2 backdrop-blur-sm">
          <QualityBadgeIcon className="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-extrabold text-soil-800">
              AI score {report.qualityScore}/100
              {report.ripeness ? <span className="font-semibold text-soil-500"> · {report.ripeness}</span> : null}
            </p>
            {report.details ? (
              <p className="truncate text-xs font-semibold text-soil-500">{report.details}</p>
            ) : null}
          </div>
          {report.grade ? (
            <span
              className={`rounded-full px-2.5 py-1 font-display text-xs font-extrabold ${gradeClasses(report.grade)}`}
            >
              Grade {report.grade}
            </span>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onReassess(batch)}
          disabled={busy}
          className="group mt-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-sky-200/60 bg-sky-50/40 px-3 py-2 text-left backdrop-blur-sm transition-all hover:border-sky-300 hover:bg-sky-50/60"
        >
          <RobotInspectIcon className="h-9 w-9 transition-transform duration-300 group-hover:scale-110" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-extrabold text-sky-900">
              Not inspected yet
            </span>
            <span className="block text-xs font-semibold text-sky-700">
              Tap to run the AI quality check.
            </span>
          </span>
        </button>
      )}

      {/* Journey */}
      <div className="mt-4">
        <BatchTimeline status={batch.status} events={batch.timeline} />
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {next && advanceLabel ? (
          <button type="button" onClick={() => onAdvance(batch)} disabled={busy} className="btn-primary group py-2.5 text-sm">
            {(() => {
              const NextIcon = STATUS_META[next].Icon;
              return <NextIcon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />;
            })()}
            {busy ? "Working…" : advanceLabel}
          </button>
        ) : null}

        {report ? (
          <button type="button" onClick={() => onReassess(batch)} disabled={busy} className="btn-ghost py-2.5 text-sm">
            Re-check quality
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="ml-auto text-sm font-bold text-leaf-700 underline decoration-leaf-300/50 decoration-2 underline-offset-4 transition-colors hover:text-leaf-900"
        >
          {expanded ? "Hide details" : "Show details"}
        </button>
      </div>

      {/* Details drawer */}
      {expanded ? (
        <div className="mt-4 animate-fade-in-up space-y-4 border-t border-leaf-100/50 pt-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Detail label="Origin" value={batch.origin?.name ?? "—"} />
            <Detail label="Currently at" value={batch.currentLocation?.name ?? "—"} />
            <Detail label="Harvested" value={formatDate(batch.harvestDate)} />
            <Detail label="Buyer" value={batch.buyerWallet ? shortenAddress(batch.buyerWallet) : "Not sold yet"} />
            {batch.chain?.tokenId ? <Detail label="Token ID" value={`#${batch.chain.tokenId}`} /> : null}
            {batch.chain?.txHash ? <Detail label="Mint tx" value={shortenAddress(batch.chain.txHash, 10, 8)} /> : null}
            {report?.modelVersion ? <Detail label="AI model" value={report.modelVersion} /> : null}
            {report?.moisturePct != null ? (
              <Detail label="Moisture" value={`${report.moisturePct}%`} />
            ) : null}
          </dl>

          {batch.notes ? (
            <p className="rounded-2xl border border-earth-100/50 bg-earth-50/50 px-3 py-2 font-accent text-sm italic text-earth-900 backdrop-blur-sm">
              &ldquo;{batch.notes}&rdquo;
            </p>
          ) : null}

          {report?.defects && report.defects.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {report.defects.map((defect) => (
                <span
                  key={defect}
                  className="rounded-full border border-sunny-200/50 bg-sunny-100/60 px-2.5 py-0.5 text-xs font-bold text-sunny-900 backdrop-blur-sm"
                >
                  {defect}
                </span>
              ))}
            </div>
          ) : null}

          <div>
            <p className="label-cartoon">Full history</p>
            <TimelineLog events={batch.timeline} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-leaf-100/40 bg-leaf-50/40 px-3 py-2 backdrop-blur-sm">
      <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-soil-400">{label}</dt>
      <dd className="truncate font-display text-sm font-extrabold text-soil-800">{value}</dd>
    </div>
  );
}
