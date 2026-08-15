import { Schema, model, type InferSchemaType } from "mongoose";
import { TRANSACTION_STATUSES, TRANSACTION_TYPES } from "../domain/constants";

/** A wallet-visible money movement: escrow funding, payout, refund or direct sale. */
const transactionSchema = new Schema(
  {
    farmerWallet: { type: String, required: true, lowercase: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: "Batch", default: null },
    batchCode: { type: String, uppercase: true, trim: true },

    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    status: { type: String, enum: TRANSACTION_STATUSES, default: "PENDING", index: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "AGRI", maxlength: 10 },

    counterparty: { type: String, lowercase: true, default: null },
    description: { type: String, maxlength: 300 },
    txHash: { type: String, maxlength: 80, default: null },

    occurredAt: { type: Date, default: Date.now },
    settledAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

transactionSchema.index({ farmerWallet: 1, occurredAt: -1 });

export type Transaction = InferSchemaType<typeof transactionSchema>;

export const TransactionModel = model("Transaction", transactionSchema);

export type TransactionDocument = InstanceType<typeof TransactionModel>;
