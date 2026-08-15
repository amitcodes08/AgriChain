import type { Request, Response } from "express";
import {
  getBatchesQuerySchema,
  registerBatchSchema,
  updateStatusSchema,
  assessQualitySchema,
} from "../validation/schemas";
import * as batchService from "../services/batch.service";
import * as chain from "../services/chain.service";
import { assessQuality, offlineFallbackReport } from "../services/ai.service";
import { asyncHandler } from "../middleware/error";
import { CROP_TYPES } from "../domain/constants";

/** Multipart handlers put the file on `req.file`; JSON callers send `photoUrl`. */
function uploadedPhoto(req: Request): batchService.UploadedPhoto | undefined {
  if (!req.file) return undefined;
  return {
    buffer: req.file.buffer,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
  };
}

export const postRegisterBatch = asyncHandler(async (req: Request, res: Response) => {
  const input = registerBatchSchema.parse(req.body);
  const photo = uploadedPhoto(req);

  const { batch, qualityReport, aiOnline } = await batchService.registerBatch(input, photo);

  res.status(201).json({
    success: true,
    message: `Batch ${batch.batchCode} registered.`,
    data: {
      batch,
      qualityReport,
      aiOnline,
      chain: chain.chainStatus(),
    },
  });
});

export const getBatches = asyncHandler(async (req: Request, res: Response) => {
  const query = getBatchesQuerySchema.parse(req.query);
  const result = await batchService.listBatches(query);

  res.json({
    success: true,
    data: result.batches,
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages,
    },
  });
});

export const getBatchById = asyncHandler(async (req: Request, res: Response) => {
  const batch = await batchService.findBatch(req.params.id);

  // The on-chain record is the source of truth; surface it next to the Mongo copy
  // so a mismatch is visible rather than silently papered over.
  const onChain = batch.chain?.tokenId ? await chain.readBatch(batch.chain.tokenId) : null;
  const onChainHistory = batch.chain?.tokenId ? await chain.readHistory(batch.chain.tokenId) : null;

  res.json({
    success: true,
    data: { batch, onChain, onChainHistory, chain: chain.chainStatus() },
  });
});

export const patchUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
  const input = updateStatusSchema.parse({ ...req.body, ...req.params });
  const batch = await batchService.updateStatus(input);

  res.json({
    success: true,
    message: `Batch ${batch.batchCode} is now ${batch.status.replace(/_/g, " ").toLowerCase()}.`,
    data: { batch },
  });
});

/** Re-runs the AI check on an existing batch (e.g. after an offline fallback). */
export const postAssessQuality = asyncHandler(async (req: Request, res: Response) => {
  const input = assessQualitySchema.parse({ ...req.body, ...req.params });
  const batch = await batchService.findBatch(input.batchId);
  const photo = uploadedPhoto(req);

  let report;
  let aiOnline = true;
  try {
    report = await assessQuality({
      cropType: batch.cropType,
      photo,
      photoUrl: input.photoUrl ?? batch.photoUrl ?? undefined,
    });
  } catch {
    report = offlineFallbackReport(batch.cropType, batch.batchCode);
    aiOnline = false;
  }

  await batchService.applyQualityReport(batch, report);

  if (batch.chain?.tokenId) {
    await chain.recordQuality(batch.chain.tokenId, report.qualityScore, `agrichain://report/${batch.batchCode}`);
  }

  res.json({
    success: true,
    message: `Quality report for ${batch.batchCode}: ${report.qualityScore}/100.`,
    data: { batch, qualityReport: report, aiOnline },
  });
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const wallet = typeof req.query.farmerWallet === "string" ? req.query.farmerWallet.toLowerCase() : undefined;
  const stats = await batchService.batchStats(wallet);

  res.json({ success: true, data: stats });
});

export const getCropTypes = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: CROP_TYPES });
});
