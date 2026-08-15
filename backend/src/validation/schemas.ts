import { z } from "zod";
import { BATCH_STATUSES, CROP_TYPES } from "../domain/constants";

const walletAddress = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid wallet address (0x…40 hex characters).")
  .transform((value) => value.toLowerCase());

const coordinates = z
  .object({
    name: z.string().trim().max(200).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .optional();

export const registerBatchSchema = z.object({
  farmerWallet: walletAddress,
  cropType: z.enum(CROP_TYPES, {
    errorMap: () => ({ message: `Pick one of: ${CROP_TYPES.join(", ")}.` }),
  }),
  quantityKg: z.coerce
    .number({ invalid_type_error: "Quantity must be a number." })
    .positive("Quantity must be more than 0 kg.")
    .max(1_000_000, "That is more than one batch can hold."),
  pricePerKg: z.coerce
    .number({ invalid_type_error: "Price must be a number." })
    .nonnegative("Price cannot be negative.")
    .max(1_000_000),
  harvestDate: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).optional(),
  origin: coordinates,
  /** Data URL or hosted URL; used when the photo is sent as JSON rather than multipart. */
  photoUrl: z.string().trim().max(2_000_000).optional(),
  /** Skips the AI call — useful for tests and for offline registration. */
  skipQualityCheck: z.coerce.boolean().optional().default(false),
});

export type RegisterBatchInput = z.infer<typeof registerBatchSchema>;

export const getBatchesQuerySchema = z.object({
  farmerWallet: walletAddress.optional(),
  status: z.enum(BATCH_STATUSES).optional(),
  cropType: z.enum(CROP_TYPES).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["newest", "oldest", "value"]).default("newest"),
});

export type GetBatchesQuery = z.infer<typeof getBatchesQuerySchema>;

export const updateStatusSchema = z.object({
  batchId: z.string().trim().min(1, "batchId is required."),
  status: z.enum(BATCH_STATUSES),
  note: z.string().trim().max(500).optional(),
  location: coordinates,
  actor: z.string().trim().max(120).optional(),
  txHash: z.string().trim().max(80).optional(),
  buyerWallet: walletAddress.optional(),
  /** Mirror the transition on chain when the chain bridge is configured. */
  syncChain: z.coerce.boolean().optional().default(true),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const upsertFarmerSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  walletAddress,
  phone: z.string().trim().max(20).optional(),
  village: z.string().trim().max(120).optional(),
  district: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  farmSizeAcres: z.coerce.number().min(0).optional(),
  avatarSeed: z.string().trim().max(40).optional(),
  location: coordinates,
});

export const walletParamSchema = z.object({ wallet: walletAddress });

export const assessQualitySchema = z.object({
  batchId: z.string().trim().min(1),
  photoUrl: z.string().trim().max(2_000_000).optional(),
});
