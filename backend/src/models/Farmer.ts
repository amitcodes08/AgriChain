import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * A farmer profile. `walletAddress` is the join key between off-chain records and
 * on-chain ownership, so it is stored lower-cased and uniquely indexed.
 */
const farmerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, "walletAddress must be a 20-byte hex address"],
    },
    phone: { type: String, trim: true, maxlength: 20 },
    village: { type: String, trim: true, maxlength: 120 },
    district: { type: String, trim: true, maxlength: 120 },
    state: { type: String, trim: true, maxlength: 120 },
    country: { type: String, trim: true, maxlength: 120, default: "India" },
    farmSizeAcres: { type: Number, min: 0, default: 0 },
    avatarSeed: { type: String, default: "sunflower" },
    location: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    /** Simulated token balance shown in the wallet module, in whole AGRI units. */
    balance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false },
);

farmerSchema.virtual("displayLocation").get(function () {
  return [this.village, this.district, this.state].filter(Boolean).join(", ");
});

farmerSchema.set("toJSON", { virtuals: true });
farmerSchema.set("toObject", { virtuals: true });

export type Farmer = InferSchemaType<typeof farmerSchema>;

export const FarmerModel = model("Farmer", farmerSchema);

export type FarmerDocument = InstanceType<typeof FarmerModel>;
