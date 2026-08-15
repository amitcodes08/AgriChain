/**
 * Shapes returned by the AgriChain API.
 *
 * These mirror `backend/src/models` and `backend/src/domain/constants.ts`. They
 * are hand-maintained rather than generated so the dashboard stays buildable on
 * its own, but the status list is ordered identically to the backend (and to the
 * Solidity enum) — that ordering is what the timeline component relies on.
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

export const CROP_TYPES = ["Potatoes", "Wheat", "Tomatoes", "Rice", "Onions", "Mangoes"] as const;
export type CropType = (typeof CROP_TYPES)[number];

export type TransactionType = "SALE" | "ESCROW" | "PAYOUT" | "REFUND";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface GeoPoint {
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface QualityReport {
  qualityScore: number;
  verified: boolean;
  grade?: string | null;
  details?: string | null;
  defects?: string[];
  ripeness?: string | null;
  moisturePct?: number | null;
  modelVersion?: string | null;
  assessedAt?: string | null;
  reportHash?: string | null;
}

export interface TimelineEvent {
  status: BatchStatus;
  label: string;
  note?: string | null;
  location?: string | null;
  actor?: string | null;
  txHash?: string | null;
  occurredAt: string;
}

export interface ChainRecord {
  tokenId?: string | null;
  txHash?: string | null;
  metadataURI?: string | null;
  dataHash?: string | null;
  contractAddress?: string | null;
  mintedAt?: string | null;
}

export interface Batch {
  _id: string;
  batchCode: string;
  farmer: string;
  farmerWallet: string;
  cropType: CropType;
  quantityKg: number;
  pricePerKg: number;
  currency: string;
  status: BatchStatus;
  photoUrl?: string | null;
  photoFilename?: string | null;
  qualityReport?: QualityReport | null;
  origin?: GeoPoint | null;
  currentLocation?: GeoPoint | null;
  harvestDate?: string | null;
  notes?: string | null;
  timeline: TimelineEvent[];
  chain?: ChainRecord | null;
  buyerWallet?: string | null;
  soldAt?: string | null;
  totalValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Farmer {
  _id: string;
  name: string;
  walletAddress: string;
  phone?: string | null;
  village?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  farmSizeAcres?: number;
  avatarSeed?: string;
  location?: GeoPoint | null;
  balance: number;
  displayLocation?: string;
}

export interface WalletTransaction {
  _id: string;
  farmerWallet: string;
  batchCode?: string | null;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  counterparty?: string | null;
  description?: string | null;
  txHash?: string | null;
  occurredAt: string;
  settledAt?: string | null;
}

export interface WalletSummary {
  walletAddress: string;
  currency: string;
  balance: number;
  pending: number;
  lifetimeEarnings: number;
  counts: { pending: number; completed: number; failed: number };
  transactions: WalletTransaction[];
}

export interface TraceMapPoint {
  batchCode: string;
  cropType: CropType;
  status: BatchStatus;
  quantityKg: number;
  origin?: GeoPoint | null;
  current?: GeoPoint | null;
  movedAt: string;
}

export interface TraceMap {
  points: TraceMapPoint[];
  unlocated: number;
}

export interface BatchStats {
  statusCounts: Partial<Record<BatchStatus, number>>;
  activeBatches: number;
  inTransit: number;
  sold: number;
  totalKg: number;
  totalValue: number;
  avgQuality: number | null;
}

export interface ChainStatus {
  enabled: boolean;
  contractAddress?: string | null;
  network?: string | null;
  chainId?: number | null;
}

export interface RegisterBatchResult {
  batch: Batch;
  qualityReport: QualityReport | null;
  aiOnline: boolean;
  chain?: ChainStatus;
}

export interface Paged<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

/** Payload the Register New Batch form submits. */
export interface RegisterBatchInput {
  farmerWallet: string;
  cropType: CropType;
  quantityKg: number;
  pricePerKg: number;
  notes?: string;
  harvestDate?: string;
  originName?: string;
  photo?: File | null;
}
