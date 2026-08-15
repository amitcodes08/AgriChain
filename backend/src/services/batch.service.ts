import { BatchModel, type BatchDocument } from "../models/Batch";
import { FarmerModel } from "../models/Farmer";
import { TransactionModel } from "../models/Transaction";
import {
  canTransition,
  CURRENCY,
  QUALITY_THRESHOLD,
  type BatchStatus,
} from "../domain/constants";
import { badRequest, notFound } from "../utils/errors";
import { withUniqueBatchCode } from "./batchCode.service";
import {
  assessQuality,
  offlineFallbackReport,
  type NormalisedQualityReport,
} from "./ai.service";
import * as chain from "./chain.service";
import { logger } from "../config/logger";
import type { GetBatchesQuery, RegisterBatchInput, UpdateStatusInput } from "../validation/schemas";

/** Friendly copy for each lifecycle step — reused by the dashboard timeline. */
const STATUS_LABELS: Record<BatchStatus, string> = {
  PLANTED: "Planted & registered",
  AI_VERIFIED: "AI quality verified",
  LISTED: "Listed on market",
  IN_TRANSIT: "On the way to buyer",
  SOLD: "Sold & paid",
  CANCELLED: "Cancelled",
};

export interface UploadedPhoto {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

/**
 * Registers a batch: persists it, asks the AI service to grade the photo, then
 * mirrors both facts on chain when the bridge is configured.
 *
 * The AI call is best-effort. A farmer standing in a field should not lose their
 * registration because a downstream service is down, so a failed assessment falls
 * back to a clearly-labelled provisional score and the batch stays at PLANTED.
 */
export async function registerBatch(
  input: RegisterBatchInput,
  photo?: UploadedPhoto,
): Promise<{ batch: BatchDocument; qualityReport: NormalisedQualityReport | null; aiOnline: boolean }> {
  const farmer = await FarmerModel.findOne({ walletAddress: input.farmerWallet });
  if (!farmer) {
    throw notFound(
      `No farmer profile for ${input.farmerWallet}. Create one via POST /api/farmers first.`,
    );
  }

  const origin = {
    name: input.origin?.name ?? farmer.get("displayLocation") ?? "Farm",
    lat: input.origin?.lat ?? farmer.location?.lat,
    lng: input.origin?.lng ?? farmer.location?.lng,
  };

  const batch = await withUniqueBatchCode((batchCode) =>
    BatchModel.create({
      batchCode,
      farmer: farmer._id,
      farmerWallet: farmer.walletAddress,
      cropType: input.cropType,
      quantityKg: input.quantityKg,
      pricePerKg: input.pricePerKg,
      currency: CURRENCY,
      status: "PLANTED",
      photoUrl: input.photoUrl,
      photoFilename: photo?.filename,
      origin,
      currentLocation: origin,
      harvestDate: input.harvestDate ?? new Date(),
      notes: input.notes,
      timeline: [
        {
          status: "PLANTED",
          label: STATUS_LABELS.PLANTED,
          note: `${input.quantityKg} kg of ${input.cropType} registered by ${farmer.name}`,
          location: origin.name,
          actor: farmer.name,
          occurredAt: new Date(),
        },
      ],
    }),
  );

  // ---- AI quality assessment (best effort) -------------------------------
  let qualityReport: NormalisedQualityReport | null = null;
  let aiOnline = false;

  if (!input.skipQualityCheck) {
    try {
      qualityReport = await assessQuality({
        cropType: input.cropType,
        photo,
        photoUrl: input.photoUrl,
      });
      aiOnline = true;
    } catch (error) {
      logger.warn({ err: error, batchCode: batch.batchCode }, "AI assessment failed");
      qualityReport = offlineFallbackReport(input.cropType, batch.batchCode);
    }

    await applyQualityReport(batch, qualityReport, { advanceStatus: aiOnline });
  }

  // ---- on-chain mirror ---------------------------------------------------
  await mintOnChain(batch, qualityReport);

  return { batch, qualityReport, aiOnline };
}

/** Records a quality report on a batch and advances it past the AI gate when it passes. */
export async function applyQualityReport(
  batch: BatchDocument,
  report: NormalisedQualityReport,
  options: { advanceStatus: boolean } = { advanceStatus: true },
): Promise<BatchDocument> {
  batch.qualityReport = {
    qualityScore: report.qualityScore,
    verified: report.verified,
    grade: report.grade,
    details: report.details,
    defects: report.defects,
    ripeness: report.ripeness,
    moisturePct: report.moisturePct,
    modelVersion: report.modelVersion,
    assessedAt: report.assessedAt,
    reportHash: report.reportHash,
  };

  const passed = report.qualityScore >= QUALITY_THRESHOLD;

  if (options.advanceStatus && passed && batch.status === "PLANTED") {
    batch.status = "AI_VERIFIED";
    batch.timeline.push({
      status: "AI_VERIFIED",
      label: STATUS_LABELS.AI_VERIFIED,
      note: `Scored ${report.qualityScore}/100 — grade ${report.grade || "n/a"}. ${report.details}`.trim(),
      location: batch.currentLocation?.name ?? batch.origin?.name,
      actor: `AI Verifier (${report.modelVersion})`,
      occurredAt: report.assessedAt,
    });
  } else if (!passed) {
    batch.timeline.push({
      status: batch.status as BatchStatus,
      label: "AI quality check failed",
      note: `Scored ${report.qualityScore}/100, below the ${QUALITY_THRESHOLD} threshold. ${report.details}`.trim(),
      location: batch.currentLocation?.name ?? batch.origin?.name,
      actor: `AI Verifier (${report.modelVersion})`,
      occurredAt: report.assessedAt,
    });
  }

  await batch.save();
  return batch;
}

/** Mints the batch NFT and attaches the attestation. No-ops when the chain is off. */
async function mintOnChain(
  batch: BatchDocument,
  qualityReport: NormalisedQualityReport | null,
): Promise<void> {
  if (!chain.isChainEnabled()) return;

  const metadata = buildTokenMetadata(batch, qualityReport);
  const dataHash = chain.hashMetadata(metadata);
  const metadataURI = `agrichain://batch/${batch.batchCode}`;

  const mint = await chain.mintBatch({
    farmerWallet: batch.farmerWallet,
    cropType: batch.cropType,
    quantityKg: batch.quantityKg,
    pricePerKg: batch.pricePerKg,
    metadataURI,
    dataHash,
    origin: batch.origin?.name ?? "Farm",
  });

  if (!mint) return;

  batch.chain = {
    tokenId: mint.tokenId,
    txHash: mint.txHash,
    metadataURI,
    dataHash,
    contractAddress: chain.chainStatus().address,
    mintedAt: new Date(),
  };
  if (batch.timeline.length > 0) {
    batch.timeline[0].txHash = mint.txHash;
  }

  if (qualityReport) {
    const qualityTx = await chain.recordQuality(
      mint.tokenId,
      qualityReport.qualityScore,
      `agrichain://report/${batch.batchCode}`,
    );
    if (qualityTx) {
      const verifiedEvent = batch.timeline.find((event) => event.status === "AI_VERIFIED");
      if (verifiedEvent) verifiedEvent.txHash = qualityTx;
    }
  }

  await batch.save();
}

/** ERC-721 metadata document for a batch. Hashed on chain so it cannot be rewritten. */
export function buildTokenMetadata(
  batch: BatchDocument,
  qualityReport: NormalisedQualityReport | null,
) {
  return {
    name: `${batch.cropType} · ${batch.batchCode}`,
    description: `${batch.quantityKg} kg of ${batch.cropType} from ${batch.origin?.name ?? "an AgriChain farm"}.`,
    external_url: `agrichain://batch/${batch.batchCode}`,
    image: batch.photoUrl ?? null,
    attributes: [
      { trait_type: "Crop", value: batch.cropType },
      { trait_type: "Quantity (kg)", value: batch.quantityKg },
      { trait_type: "Price per kg", value: `${batch.pricePerKg} ${batch.currency}` },
      { trait_type: "Origin", value: batch.origin?.name ?? "unknown" },
      { trait_type: "Harvest date", value: batch.harvestDate?.toISOString() ?? null },
      { trait_type: "Quality score", value: qualityReport?.qualityScore ?? null },
      { trait_type: "Quality grade", value: qualityReport?.grade ?? null },
      { trait_type: "AI model", value: qualityReport?.modelVersion ?? null },
    ],
  };
}

export interface PagedBatches {
  batches: BatchDocument[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export async function listBatches(query: GetBatchesQuery): Promise<PagedBatches> {
  const filter: Record<string, unknown> = {};
  if (query.farmerWallet) filter.farmerWallet = query.farmerWallet;
  if (query.status) filter.status = query.status;
  if (query.cropType) filter.cropType = query.cropType;
  if (query.search) {
    const term = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { batchCode: new RegExp(term, "i") },
      { cropType: new RegExp(term, "i") },
      { "origin.name": new RegExp(term, "i") },
    ];
  }

  const sort: Record<string, 1 | -1> =
    query.sort === "oldest"
      ? { createdAt: 1 }
      : query.sort === "value"
        ? { pricePerKg: -1 }
        : { createdAt: -1 };

  const [batches, total] = await Promise.all([
    BatchModel.find(filter)
      .sort(sort)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate("farmer", "name walletAddress village district state"),
    BatchModel.countDocuments(filter),
  ]);

  return {
    batches,
    total,
    page: query.page,
    limit: query.limit,
    pages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

/** Looks a batch up by Mongo id or by its human-facing code. */
export async function findBatch(idOrCode: string): Promise<BatchDocument> {
  const byId = /^[a-f\d]{24}$/i.test(idOrCode)
    ? await BatchModel.findById(idOrCode).populate("farmer", "name walletAddress village district state")
    : null;

  const batch =
    byId ??
    (await BatchModel.findOne({ batchCode: idOrCode.toUpperCase() }).populate(
      "farmer",
      "name walletAddress village district state",
    ));

  if (!batch) throw notFound(`No batch matching "${idOrCode}".`);
  return batch;
}

/**
 * Moves a batch to a new lifecycle state, appending to its timeline and keeping
 * the farmer's wallet ledger in step.
 */
export async function updateStatus(input: UpdateStatusInput): Promise<BatchDocument> {
  const batch = await findBatch(input.batchId);
  const from = batch.status as BatchStatus;

  if (from === input.status) {
    throw badRequest(`Batch ${batch.batchCode} is already ${STATUS_LABELS[input.status]}.`);
  }
  if (!canTransition(from, input.status)) {
    throw badRequest(
      `Cannot move ${batch.batchCode} from ${STATUS_LABELS[from]} to ${STATUS_LABELS[input.status]}.`,
    );
  }
  if (input.status === "LISTED" && !batch.qualityReport?.verified) {
    throw badRequest(
      `Batch ${batch.batchCode} needs a passing AI quality check before it can be listed.`,
    );
  }

  const location = {
    name: input.location?.name ?? batch.currentLocation?.name ?? batch.origin?.name,
    lat: input.location?.lat ?? batch.currentLocation?.lat,
    lng: input.location?.lng ?? batch.currentLocation?.lng,
  };

  batch.status = input.status;
  batch.currentLocation = location;
  if (input.buyerWallet) batch.buyerWallet = input.buyerWallet;
  if (input.status === "SOLD") batch.soldAt = new Date();

  batch.timeline.push({
    status: input.status,
    label: STATUS_LABELS[input.status],
    note: input.note,
    location: location.name,
    actor: input.actor ?? "AgriChain",
    txHash: input.txHash,
    occurredAt: new Date(),
  });

  await batch.save();

  if (input.syncChain && batch.chain?.tokenId) {
    const txHash =
      input.status === "LISTED"
        ? await chain.listOnMarket(batch.chain.tokenId, batch.pricePerKg)
        : await chain.pushStatus(
            batch.chain.tokenId,
            input.status,
            location.name ?? "",
            input.note ?? STATUS_LABELS[input.status],
          );

    if (txHash) {
      batch.timeline[batch.timeline.length - 1].txHash = txHash;
      await batch.save();
    }
  }

  await recordLedgerEntry(batch, input.status);

  return batch;
}

/**
 * Keeps the farmer wallet in step with the batch lifecycle:
 *   IN_TRANSIT → buyer's money is escrowed, so a PENDING credit appears
 *   SOLD       → escrow released, credit completes and the balance moves
 *   CANCELLED  → any pending credit for the batch fails
 */
async function recordLedgerEntry(batch: BatchDocument, status: BatchStatus): Promise<void> {
  const amount = Number((batch.quantityKg * batch.pricePerKg).toFixed(2));

  if (status === "IN_TRANSIT") {
    await TransactionModel.create({
      farmerWallet: batch.farmerWallet,
      batch: batch._id,
      batchCode: batch.batchCode,
      type: "ESCROW",
      status: "PENDING",
      amount,
      currency: batch.currency,
      counterparty: batch.buyerWallet ?? undefined,
      description: `Escrow funded for ${batch.quantityKg} kg of ${batch.cropType}`,
      occurredAt: new Date(),
    });
    return;
  }

  if (status === "SOLD") {
    const pending = await TransactionModel.findOne({
      batch: batch._id,
      status: "PENDING",
    }).sort({ createdAt: -1 });

    if (pending) {
      pending.type = "PAYOUT";
      pending.status = "COMPLETED";
      pending.settledAt = new Date();
      pending.description = `Payment released for ${batch.batchCode} (${batch.cropType})`;
      await pending.save();
    } else {
      await TransactionModel.create({
        farmerWallet: batch.farmerWallet,
        batch: batch._id,
        batchCode: batch.batchCode,
        type: "SALE",
        status: "COMPLETED",
        amount,
        currency: batch.currency,
        counterparty: batch.buyerWallet ?? undefined,
        description: `Direct sale of ${batch.batchCode} (${batch.cropType})`,
        occurredAt: new Date(),
        settledAt: new Date(),
      });
    }

    await FarmerModel.updateOne({ walletAddress: batch.farmerWallet }, { $inc: { balance: amount } });
    return;
  }

  if (status === "CANCELLED") {
    await TransactionModel.updateMany(
      { batch: batch._id, status: "PENDING" },
      { $set: { status: "FAILED", description: `Cancelled — ${batch.batchCode} did not complete` } },
    );
  }
}

/** Aggregate counters for the dashboard hero strip. */
export async function batchStats(farmerWallet?: string) {
  const match = farmerWallet ? { farmerWallet } : {};

  const [byStatus, totals] = await Promise.all([
    BatchModel.aggregate<{ _id: BatchStatus; count: number }>([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    BatchModel.aggregate<{ totalKg: number; totalValue: number; avgQuality: number }>([
      { $match: match },
      {
        $group: {
          _id: null,
          totalKg: { $sum: "$quantityKg" },
          totalValue: { $sum: { $multiply: ["$quantityKg", "$pricePerKg"] } },
          avgQuality: { $avg: "$qualityReport.qualityScore" },
        },
      },
    ]),
  ]);

  const statusCounts = byStatus.reduce<Record<string, number>>((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});

  return {
    statusCounts,
    activeBatches: (statusCounts.PLANTED ?? 0) + (statusCounts.AI_VERIFIED ?? 0) + (statusCounts.LISTED ?? 0),
    inTransit: statusCounts.IN_TRANSIT ?? 0,
    sold: statusCounts.SOLD ?? 0,
    totalKg: totals[0]?.totalKg ?? 0,
    totalValue: Number((totals[0]?.totalValue ?? 0).toFixed(2)),
    avgQuality: totals[0]?.avgQuality ? Math.round(totals[0].avgQuality) : null,
  };
}
