import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/db";
import { logger } from "../config/logger";
import { FarmerModel } from "../models/Farmer";
import { BatchModel } from "../models/Batch";
import { TransactionModel } from "../models/Transaction";

/**
 * Seeds a demo farmer with batches spread across the lifecycle so the dashboard
 * has something to show on first run. Idempotent: it wipes the demo farmer's data
 * before re-inserting.
 */

const DEMO_WALLET = (process.env.DEMO_FARMER_WALLET ?? "0x70997970c51812dc3a010c7d01b50e0d17dc79c8").toLowerCase();
const BUYER_WALLET = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc";

const NASHIK = { name: "Nashik, Maharashtra", lat: 19.9975, lng: 73.7898 };
const PUNE = { name: "Pune Wholesale Market", lat: 18.5204, lng: 73.8567 };
const MUMBAI = { name: "Vashi APMC, Mumbai", lat: 19.0760, lng: 72.8777 };
const NH60 = { name: "NH-60 near Sinnar", lat: 19.8500, lng: 74.0000 };

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function seed(): Promise<void> {
  await connectDatabase();

  const farmer = await FarmerModel.findOneAndUpdate(
    { walletAddress: DEMO_WALLET },
    {
      $set: {
        name: "Anita Deshmukh",
        walletAddress: DEMO_WALLET,
        phone: "+91 98220 11234",
        village: "Ozar",
        district: "Nashik",
        state: "Maharashtra",
        country: "India",
        farmSizeAcres: 12,
        avatarSeed: "sunflower",
        location: { lat: NASHIK.lat, lng: NASHIK.lng },
        balance: 0,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await BatchModel.deleteMany({ farmerWallet: DEMO_WALLET });
  await TransactionModel.deleteMany({ farmerWallet: DEMO_WALLET });

  const batches = [
    {
      batchCode: "AGT-001",
      cropType: "Potatoes" as const,
      quantityKg: 1200,
      pricePerKg: 18.5,
      status: "SOLD" as const,
      quality: { score: 92, grade: "A", details: "High grade, firm skin, minimal blemishes." },
      origin: NASHIK,
      currentLocation: PUNE,
      harvestDate: daysAgo(24),
      buyerWallet: BUYER_WALLET,
      soldAt: daysAgo(9),
      timeline: [
        { status: "PLANTED", label: "Planted & registered", at: daysAgo(24), loc: NASHIK.name },
        { status: "AI_VERIFIED", label: "AI quality verified", at: daysAgo(23), loc: NASHIK.name },
        { status: "LISTED", label: "Listed on market", at: daysAgo(20), loc: NASHIK.name },
        { status: "IN_TRANSIT", label: "On the way to buyer", at: daysAgo(12), loc: NH60.name },
        { status: "SOLD", label: "Sold & paid", at: daysAgo(9), loc: PUNE.name },
      ],
    },
    {
      batchCode: "AGT-002",
      cropType: "Tomatoes" as const,
      quantityKg: 450,
      pricePerKg: 32,
      status: "IN_TRANSIT" as const,
      quality: { score: 88, grade: "A", details: "Ripeness optimal, transport within 48 hours." },
      origin: NASHIK,
      currentLocation: NH60,
      harvestDate: daysAgo(6),
      buyerWallet: BUYER_WALLET,
      timeline: [
        { status: "PLANTED", label: "Planted & registered", at: daysAgo(6), loc: NASHIK.name },
        { status: "AI_VERIFIED", label: "AI quality verified", at: daysAgo(6), loc: NASHIK.name },
        { status: "LISTED", label: "Listed on market", at: daysAgo(4), loc: NASHIK.name },
        { status: "IN_TRANSIT", label: "On the way to buyer", at: daysAgo(1), loc: NH60.name },
      ],
    },
    {
      batchCode: "AGT-003",
      cropType: "Wheat" as const,
      quantityKg: 3000,
      pricePerKg: 24.75,
      status: "LISTED" as const,
      quality: { score: 95, grade: "A", details: "Excellent grain fill, moisture within range." },
      origin: NASHIK,
      currentLocation: NASHIK,
      harvestDate: daysAgo(11),
      timeline: [
        { status: "PLANTED", label: "Planted & registered", at: daysAgo(11), loc: NASHIK.name },
        { status: "AI_VERIFIED", label: "AI quality verified", at: daysAgo(10), loc: NASHIK.name },
        { status: "LISTED", label: "Listed on market", at: daysAgo(8), loc: NASHIK.name },
      ],
    },
    {
      batchCode: "AGT-004",
      cropType: "Onions" as const,
      quantityKg: 800,
      pricePerKg: 21,
      status: "AI_VERIFIED" as const,
      quality: { score: 79, grade: "B", details: "Good size grading, a little surface soil." },
      origin: NASHIK,
      currentLocation: NASHIK,
      harvestDate: daysAgo(3),
      timeline: [
        { status: "PLANTED", label: "Planted & registered", at: daysAgo(3), loc: NASHIK.name },
        { status: "AI_VERIFIED", label: "AI quality verified", at: daysAgo(2), loc: NASHIK.name },
      ],
    },
    {
      batchCode: "AGT-005",
      cropType: "Mangoes" as const,
      quantityKg: 300,
      pricePerKg: 68,
      status: "PLANTED" as const,
      quality: null,
      origin: NASHIK,
      currentLocation: NASHIK,
      harvestDate: daysAgo(1),
      timeline: [{ status: "PLANTED", label: "Planted & registered", at: daysAgo(1), loc: NASHIK.name }],
    },
  ];

  for (const seedBatch of batches) {
    await BatchModel.create({
      batchCode: seedBatch.batchCode,
      farmer: farmer._id,
      farmerWallet: DEMO_WALLET,
      cropType: seedBatch.cropType,
      quantityKg: seedBatch.quantityKg,
      pricePerKg: seedBatch.pricePerKg,
      currency: "AGRI",
      status: seedBatch.status,
      origin: seedBatch.origin,
      currentLocation: seedBatch.currentLocation,
      harvestDate: seedBatch.harvestDate,
      buyerWallet: seedBatch.buyerWallet ?? null,
      soldAt: seedBatch.soldAt ?? null,
      qualityReport: seedBatch.quality
        ? {
            qualityScore: seedBatch.quality.score,
            verified: seedBatch.quality.score >= 60,
            grade: seedBatch.quality.grade,
            details: seedBatch.quality.details,
            defects: [],
            ripeness: "optimal",
            moisturePct: 12,
            modelVersion: "agri-vision-sim-1.2.0",
            assessedAt: seedBatch.timeline[1]?.at ?? seedBatch.harvestDate,
          }
        : undefined,
      timeline: seedBatch.timeline.map((event) => ({
        status: event.status,
        label: event.label,
        location: event.loc,
        actor: event.status === "AI_VERIFIED" ? "AI Verifier (agri-vision-sim-1.2.0)" : farmer.name,
        occurredAt: event.at,
      })),
    });
  }

  // Ledger mirrors the batch states above.
  const sold = batches[0];
  const inTransit = batches[1];
  const soldTotal = sold.quantityKg * sold.pricePerKg;
  const escrowTotal = inTransit.quantityKg * inTransit.pricePerKg;

  await TransactionModel.create([
    {
      farmerWallet: DEMO_WALLET,
      batchCode: sold.batchCode,
      type: "PAYOUT",
      status: "COMPLETED",
      amount: soldTotal,
      currency: "AGRI",
      counterparty: BUYER_WALLET,
      description: `Payment released for ${sold.batchCode} (Potatoes)`,
      occurredAt: daysAgo(9),
      settledAt: daysAgo(9),
    },
    {
      farmerWallet: DEMO_WALLET,
      batchCode: inTransit.batchCode,
      type: "ESCROW",
      status: "PENDING",
      amount: escrowTotal,
      currency: "AGRI",
      counterparty: BUYER_WALLET,
      description: `Escrow funded for ${inTransit.quantityKg} kg of Tomatoes`,
      occurredAt: daysAgo(1),
    },
    {
      farmerWallet: DEMO_WALLET,
      batchCode: "AGT-000",
      type: "SALE",
      status: "COMPLETED",
      amount: 8400,
      currency: "AGRI",
      counterparty: BUYER_WALLET,
      description: "Earlier season sale — Rice, 400 kg",
      occurredAt: daysAgo(45),
      settledAt: daysAgo(45),
    },
  ]);

  await FarmerModel.updateOne({ walletAddress: DEMO_WALLET }, { $set: { balance: soldTotal + 8400 } });

  logger.info(
    { wallet: DEMO_WALLET, batches: batches.length },
    "🌾 Seed complete — open the dashboard to see the demo farm",
  );
}

seed()
  .then(async () => {
    await disconnectDatabase();
    process.exit(0);
  })
  .catch(async (error) => {
    logger.error({ err: error }, "Seed failed");
    await mongoose.connection.close().catch(() => undefined);
    process.exit(1);
  });
