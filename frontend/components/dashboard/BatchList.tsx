"use client";

import { useMemo, useState } from "react";
import { BatchCard } from "./BatchCard";
import { Panel, EmptyState, PanelSkeleton, ErrorNote } from "@/components/ui/Panel";
import { GrowingPlantFieldIcon, RefreshIcon, ScarecrowIcon } from "@/components/icons/CartoonIcons";
import { STATUS_META, formatNumber } from "@/lib/status";
import { BATCH_STATUSES, type Batch, type BatchStatus } from "@/lib/types";

type Filter = "ALL" | BatchStatus;

export interface BatchListProps {
  batches: Batch[];
  loading: boolean;
  error: string | null;
  busyBatchId: string | null;
  onRefresh: () => void;
  onAdvance: (batch: Batch) => void;
  onReassess: (batch: Batch) => void;
}

/**
 * Active Crop Batches.
 *
 * A responsive grid of cards rather than a table: on a phone each batch gets the
 * full width, and the filter chips carry their own status icons so the control
 * strip doubles as a legend for the card statuses.
 */
export function BatchList({
  batches,
  loading,
  error,
  busyBatchId,
  onRefresh,
  onAdvance,
  onReassess,
}: BatchListProps) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    return batches.reduce<Record<string, number>>((acc, batch) => {
      acc[batch.status] = (acc[batch.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [batches]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return batches.filter((batch) => {
      if (filter !== "ALL" && batch.status !== filter) return false;
      if (!needle) return true;
      return (
        batch.batchCode.toLowerCase().includes(needle) || batch.cropType.toLowerCase().includes(needle)
      );
    });
  }, [batches, filter, search]);

  // Chips for statuses that actually occur, so a new farmer isn't shown five
  // empty filters on day one.
  const chipStatuses = BATCH_STATUSES.filter((status) => (counts[status] ?? 0) > 0);

  return (
    <Panel
      title="Active Crop Batches"
      subtitle={`${formatNumber(batches.length)} batch${batches.length === 1 ? "" : "es"} growing in your field ledger`}
      Icon={GrowingPlantFieldIcon}
      accent="bg-leaf-100/80"
      action={
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="btn-ghost group px-3 py-2 text-sm"
          title="Refresh batches"
        >
          <RefreshIcon className="h-5 w-5 transition-transform duration-500 group-hover:rotate-180" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      {/* Controls */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-soil-400">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by batch ID or crop…"
            className="input-cartoon py-2.5 pl-10 text-sm"
            aria-label="Search batches"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "ALL"} onClick={() => setFilter("ALL")} count={batches.length}>
            All batches
          </FilterChip>

          {chipStatuses.map((status) => {
            const meta = STATUS_META[status];
            return (
              <FilterChip
                key={status}
                active={filter === status}
                onClick={() => setFilter(status)}
                count={counts[status] ?? 0}
                Icon={meta.Icon}
              >
                {meta.short}
              </FilterChip>
            );
          })}
        </div>
      </div>

      {error ? <ErrorNote message={error} onRetry={onRefresh} /> : null}

      {loading && batches.length === 0 ? (
        <PanelSkeleton rows={3} />
      ) : visible.length === 0 ? (
        <EmptyState
          Icon={ScarecrowIcon}
          title={batches.length === 0 ? "No batches yet" : "Nothing matches that"}
          hint={
            batches.length === 0
              ? "Register your first harvest above and it will appear here with its own traceable journey."
              : "Try another crop name, or clear the filter to see everything."
          }
          action={
            batches.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setFilter("ALL");
                  setSearch("");
                }}
                className="btn-ghost mt-1 py-2 text-sm"
              >
                Clear filters
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visible.map((batch) => (
            <BatchCard
              key={batch._id}
              batch={batch}
              busy={busyBatchId === batch._id}
              onAdvance={onAdvance}
              onReassess={onReassess}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function FilterChip({
  active,
  onClick,
  count,
  Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  Icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-xs font-extrabold backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95 ${
        active
          ? "border-leaf-500/70 bg-leaf-500 text-white shadow-glow-leaf"
          : "border-leaf-200/50 bg-white/60 text-soil-600 hover:border-leaf-300/70 hover:bg-white/80"
      }`}
    >
      {Icon ? <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-125" /> : null}
      {children}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[0.65rem] ${
          active ? "bg-white/25 text-white" : "bg-leaf-100/70 text-leaf-800"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
