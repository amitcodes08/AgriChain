/**
 * Domain vocabulary shared by the API, the dashboard and the smart contract.
 * The order of BATCH_STATUSES is significant: it matches the Solidity `Status`
 * enum indices exactly, so `statusToChainEnum` is just an index lookup.
 */
export const BATCH_STATUSES = [
  "PLANTED",
  "AI_VERIFIED",
  "LISTED",
  "IN_TRANSIT",
  "SOLD",
  "CANCELLED",
] as const;

export type BatchStatus = (typeof BATCH_STATUSES)[number];

export function statusToChainEnum(status: BatchStatus): number {
  return BATCH_STATUSES.indexOf(status);
}

export function chainEnumToStatus(value: number): BatchStatus {
  return BATCH_STATUSES[value] ?? "PLANTED";
}

/** Only forward moves are legal, plus cancellation from any live state. */
export const ALLOWED_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  PLANTED: ["AI_VERIFIED", "CANCELLED"],
  AI_VERIFIED: ["LISTED", "CANCELLED"],
  LISTED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["SOLD", "CANCELLED"],
  SOLD: [],
  CANCELLED: [],
};

export function canTransition(from: BatchStatus, to: BatchStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export const CROP_TYPES = [
  "Potatoes",
  "Wheat",
  "Tomatoes",
  "Rice",
  "Onions",
  "Mangoes",
] as const;

export type CropType = (typeof CROP_TYPES)[number];

export const TRANSACTION_TYPES = ["SALE", "ESCROW", "PAYOUT", "REFUND"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ["PENDING", "COMPLETED", "FAILED"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

/** Display currency for the farmer wallet. */
export const CURRENCY = "AGRI";

/** Minimum AI score for a batch to be market-ready — mirrors the contract default. */
export const QUALITY_THRESHOLD = 60;
