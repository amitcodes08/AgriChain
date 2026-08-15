import { Schema, model, type InferSchemaType } from "mongoose";
import { BATCH_STATUSES, CROP_TYPES } from "../domain/constants";

/** One entry in a batch's illustrative timeline. */
const timelineEventSchema = new Schema(
  {
    status: { type: String, enum: BATCH_STATUSES, required: true },
    label: { type: String, required: true, maxlength: 120 },
    note: { type: String, maxlength: 500 },
    location: { type: String, maxlength: 200 },
    actor: { type: String, maxlength: 120 },
    txHash: { type: String, maxlength: 80 },
    occurredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

/** Quality report returned by the AI microservice, stored verbatim for audit. */
const qualityReportSchema = new Schema(
  {
    qualityScore: { type: Number, min: 0, max: 100, required: true },
    verified: { type: Boolean, required: true },
    grade: { type: String, maxlength: 20 },
    details: { type: String, maxlength: 1000 },
    defects: [{ type: String, maxlength: 120 }],
    ripeness: { type: String, maxlength: 40 },
    moisturePct: { type: Number, min: 0, max: 100 },
    modelVersion: { type: String, maxlength: 40 },
    assessedAt: { type: Date, default: Date.now },
    reportHash: { type: String, maxlength: 80 },
  },
  { _id: false },
);

const batchSchema = new Schema(
  {
    /** Human-facing identifier shown on the dashboard, e.g. "AGT-293". */
    batchCode: { type: String, required: true, unique: true, uppercase: true, trim: true },

    farmer: { type: Schema.Types.ObjectId, ref: "Farmer", required: true, index: true },
    farmerWallet: { type: String, required: true, lowercase: true, index: true },

    cropType: { type: String, enum: CROP_TYPES, required: true },
    quantityKg: { type: Number, required: true, min: 1 },
    pricePerKg: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "AGRI", maxlength: 10 },

    status: { type: String, enum: BATCH_STATUSES, default: "PLANTED", index: true },

    photoUrl: { type: String, maxlength: 500 },
    photoFilename: { type: String, maxlength: 260 },

    qualityReport: { type: qualityReportSchema, default: undefined },

    origin: {
      name: { type: String, maxlength: 200 },
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    /** Where the produce is right now — drives the traceability map pin. */
    currentLocation: {
      name: { type: String, maxlength: 200 },
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },

    harvestDate: { type: Date },
    notes: { type: String, maxlength: 1000 },

    timeline: { type: [timelineEventSchema], default: [] },

    /** On-chain mirror. Null until the batch is minted. */
    chain: {
      tokenId: { type: String, default: null },
      txHash: { type: String, default: null },
      metadataURI: { type: String, default: null },
      dataHash: { type: String, default: null },
      contractAddress: { type: String, default: null },
      mintedAt: { type: Date, default: null },
    },

    buyerWallet: { type: String, lowercase: true, default: null },
    soldAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

// The dashboard's default query is "my batches, newest first".
batchSchema.index({ farmerWallet: 1, createdAt: -1 });
batchSchema.index({ status: 1, createdAt: -1 });

batchSchema.virtual("totalValue").get(function () {
  return Number((this.quantityKg * this.pricePerKg).toFixed(2));
});

batchSchema.set("toJSON", { virtuals: true });
batchSchema.set("toObject", { virtuals: true });

export type Batch = InferSchemaType<typeof batchSchema>;

export const BatchModel = model("Batch", batchSchema);

/** Derived from the model so it matches exactly what queries and `create` return. */
export type BatchDocument = InstanceType<typeof BatchModel>;
