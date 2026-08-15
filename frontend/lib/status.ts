import type { ComponentType } from "react";
import {
  CancelledCrateIcon,
  DeliveryTruckIcon,
  HandshakeCoinIcon,
  RobotInspectIcon,
  SeedlingIcon,
  StorefrontIcon,
  type IconProps,
} from "@/components/icons/CartoonIcons";
import type { BatchStatus } from "./types";

/**
 * Everything the UI needs to render a status: the farmer-facing label, its
 * cartoon icon, and the colour family it belongs to. Keeping this in one map
 * means a status can never be labelled one way in the card and another in the
 * timeline.
 */
export interface StatusMeta {
  label: string;
  short: string;
  description: string;
  Icon: ComponentType<IconProps>;
  /** Tailwind classes for the pill form. */
  pill: string;
  /** Tailwind classes for the timeline dot when the step is reached. */
  dot: string;
  /** Soft background for the icon medallion. */
  medallion: string;
}

export const STATUS_META: Record<BatchStatus, StatusMeta> = {
  PLANTED: {
    label: "Planted",
    short: "Planted",
    description: "Registered on the farm and waiting for its quality check.",
    Icon: SeedlingIcon,
    pill: "bg-leaf-100 text-leaf-800 ring-leaf-300",
    dot: "bg-leaf-500",
    medallion: "bg-leaf-100",
  },
  AI_VERIFIED: {
    label: "AI Quality Verified",
    short: "Verified",
    description: "Our AI inspector graded the photo and approved the batch.",
    Icon: RobotInspectIcon,
    pill: "bg-sky-100 text-sky-800 ring-sky-300",
    dot: "bg-sky-500",
    medallion: "bg-sky-100",
  },
  LISTED: {
    label: "Listed on Market",
    short: "Listed",
    description: "Live on the marketplace — buyers can purchase it now.",
    Icon: StorefrontIcon,
    pill: "bg-sunny-100 text-sunny-800 ring-sunny-300",
    dot: "bg-sunny-400",
    medallion: "bg-sunny-100",
  },
  IN_TRANSIT: {
    label: "On the Way",
    short: "In transit",
    description: "Bought and escrowed. The produce is travelling to the buyer.",
    Icon: DeliveryTruckIcon,
    pill: "bg-earth-100 text-earth-800 ring-earth-300",
    dot: "bg-earth-500",
    medallion: "bg-earth-100",
  },
  SOLD: {
    label: "Sold",
    short: "Sold",
    description: "The buyer confirmed delivery and the escrow paid out.",
    Icon: HandshakeCoinIcon,
    pill: "bg-leaf-200 text-leaf-900 ring-leaf-400",
    dot: "bg-leaf-700",
    medallion: "bg-leaf-200",
  },
  CANCELLED: {
    label: "Cancelled",
    short: "Cancelled",
    description: "This batch was withdrawn before it sold.",
    Icon: CancelledCrateIcon,
    pill: "bg-soil-100 text-soil-700 ring-soil-300",
    dot: "bg-soil-400",
    medallion: "bg-soil-100",
  },
};

/** The happy path, in order. `CANCELLED` sits outside it by design. */
export const LIFECYCLE: BatchStatus[] = ["PLANTED", "AI_VERIFIED", "LISTED", "IN_TRANSIT", "SOLD"];

/** Forward-only transitions, mirroring the backend and the contract. */
export const NEXT_STATUS: Partial<Record<BatchStatus, BatchStatus>> = {
  PLANTED: "AI_VERIFIED",
  AI_VERIFIED: "LISTED",
  LISTED: "IN_TRANSIT",
  IN_TRANSIT: "SOLD",
};

/** Verb shown on the "advance this batch" button. */
export const ADVANCE_LABEL: Partial<Record<BatchStatus, string>> = {
  AI_VERIFIED: "List on market",
  LISTED: "Mark as picked up",
  IN_TRANSIT: "Confirm sale",
};

export function statusIndex(status: BatchStatus): number {
  const index = LIFECYCLE.indexOf(status);
  // Cancelled batches stop wherever they were; treat them as "not progressing".
  return index === -1 ? 0 : index;
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

const numberFormat = new Intl.NumberFormat("en-IN");

export function formatNumber(value: number): string {
  return numberFormat.format(Math.round(value));
}

export function formatTokens(value: number, currency = "AGRI"): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${currency}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "0x7099…79c8" — long enough to recognise, short enough to fit a pill. */
export function shortenAddress(address?: string | null, lead = 6, tail = 4): string {
  if (!address) return "—";
  if (address.length <= lead + tail + 2) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** A cartoon emoji per crop — used where a full SVG would be too heavy. */
export const CROP_EMOJI: Record<string, string> = {
  Potatoes: "🥔",
  Wheat: "🌾",
  Tomatoes: "🍅",
  Rice: "🍚",
  Onions: "🧅",
  Mangoes: "🥭",
};

/** Grade → colour, so an A never looks the same as a D. */
export function gradeClasses(grade?: string | null): string {
  switch ((grade ?? "").toUpperCase()) {
    case "A":
      return "bg-leaf-500 text-white";
    case "B":
      return "bg-sky-500 text-white";
    case "C":
      return "bg-sunny-400 text-sunny-900";
    default:
      return "bg-earth-400 text-white";
  }
}
