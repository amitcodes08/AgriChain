import type { Request, Response } from "express";
import { FarmerModel } from "../models/Farmer";
import { TransactionModel } from "../models/Transaction";
import { BatchModel } from "../models/Batch";
import { upsertFarmerSchema, walletParamSchema } from "../validation/schemas";
import { asyncHandler } from "../middleware/error";
import { notFound } from "../utils/errors";
import { CURRENCY } from "../domain/constants";

/** Creates or updates a farmer profile, keyed on wallet address. */
export const putFarmer = asyncHandler(async (req: Request, res: Response) => {
  const input = upsertFarmerSchema.parse(req.body);

  const farmer = await FarmerModel.findOneAndUpdate(
    { walletAddress: input.walletAddress },
    { $set: input },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );

  res.status(201).json({ success: true, data: farmer });
});

export const getFarmer = asyncHandler(async (req: Request, res: Response) => {
  const { wallet } = walletParamSchema.parse(req.params);

  const farmer = await FarmerModel.findOne({ walletAddress: wallet });
  if (!farmer) throw notFound(`No farmer profile for ${wallet}.`);

  res.json({ success: true, data: farmer });
});

/**
 * Wallet view: balance plus the ledger.
 *
 * `pending` is money the farmer can see but not yet spend — it is sitting in the
 * contract's escrow until the buyer confirms receipt.
 */
export const getWallet = asyncHandler(async (req: Request, res: Response) => {
  const { wallet } = walletParamSchema.parse(req.params);
  const limit = Math.min(Number(req.query.limit ?? 20), 100);

  const farmer = await FarmerModel.findOne({ walletAddress: wallet });
  if (!farmer) throw notFound(`No farmer profile for ${wallet}.`);

  const [transactions, aggregates] = await Promise.all([
    TransactionModel.find({ farmerWallet: wallet }).sort({ occurredAt: -1 }).limit(limit).lean(),
    TransactionModel.aggregate<{ _id: string; total: number; count: number }>([
      { $match: { farmerWallet: wallet } },
      { $group: { _id: "$status", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
  ]);

  const byStatus = aggregates.reduce<Record<string, { total: number; count: number }>>((acc, row) => {
    acc[row._id] = { total: Number(row.total.toFixed(2)), count: row.count };
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      walletAddress: wallet,
      currency: CURRENCY,
      balance: Number(farmer.balance.toFixed(2)),
      pending: byStatus.PENDING?.total ?? 0,
      lifetimeEarnings: byStatus.COMPLETED?.total ?? 0,
      counts: {
        pending: byStatus.PENDING?.count ?? 0,
        completed: byStatus.COMPLETED?.count ?? 0,
        failed: byStatus.FAILED?.count ?? 0,
      },
      transactions,
    },
  });
});

/**
 * Points for the traceability map: one marker per batch with a known position,
 * plus the origin→current leg so the UI can draw the journey.
 */
export const getTraceMap = asyncHandler(async (req: Request, res: Response) => {
  const { wallet } = walletParamSchema.parse(req.params);

  const batches = await BatchModel.find({ farmerWallet: wallet })
    .select("batchCode cropType status quantityKg origin currentLocation updatedAt")
    .sort({ updatedAt: -1 })
    .lean();

  const points = batches
    .filter((batch) => batch.currentLocation?.lat != null && batch.currentLocation?.lng != null)
    .map((batch) => ({
      batchCode: batch.batchCode,
      cropType: batch.cropType,
      status: batch.status,
      quantityKg: batch.quantityKg,
      origin: batch.origin,
      current: batch.currentLocation,
      movedAt: batch.updatedAt,
    }));

  res.json({
    success: true,
    data: {
      points,
      // Everything without coordinates still deserves a mention in the list view.
      unlocated: batches.length - points.length,
    },
  });
});
