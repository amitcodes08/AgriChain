import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Walks a handful of batches through the full lifecycle on the local chain so the
 * dashboard has something to render immediately after `docker compose up`.
 */
async function main() {
  const deploymentPath = path.resolve(__dirname, `../deployments/${network.name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for "${network.name}". Run deploy.ts first.`);
  }
  const { address } = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const [admin, farmer, verifier, distributor, buyer] = await ethers.getSigners();
  const contract = await ethers.getContractAt("AgriSupplyChain", address);

  const seeds = [
    { crop: "Potatoes", kg: 1200n, pricePerKg: ethers.parseEther("0.0004"), origin: "Nashik, Maharashtra", score: 92 },
    { crop: "Tomatoes", kg: 450n, pricePerKg: ethers.parseEther("0.0009"), origin: "Nashik, Maharashtra", score: 88 },
    { crop: "Wheat", kg: 3000n, pricePerKg: ethers.parseEther("0.00025"), origin: "Ludhiana, Punjab", score: 95 },
  ];

  console.log(`\n🚜  Seeding ${seeds.length} batches on "${network.name}"…`);

  for (const [index, seed] of seeds.entries()) {
    const metadataURI = `ipfs://agrichain/demo/${seed.crop.toLowerCase()}-${index + 1}.json`;
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(`${seed.crop}:${seed.kg}:${seed.origin}`));

    const registerTx = await contract
      .connect(farmer)
      .registerBatch(farmer.address, seed.crop, seed.kg, seed.pricePerKg, metadataURI, dataHash, seed.origin);
    const receipt = await registerTx.wait();
    const batchId = await contract.totalBatches();
    console.log(`    #${batchId} ${seed.crop} registered (gas ${receipt?.gasUsed})`);

    // Every batch gets an AI attestation.
    await (
      await contract
        .connect(verifier)
        .recordQualityAssessment(batchId, seed.score, `ipfs://agrichain/reports/${batchId}.json`)
    ).wait();
    console.log(`       🤖 quality ${seed.score}/100 attested`);

    if (index === 0) {
      // Batch 1 runs all the way to Sold so the wallet module has a completed payment.
      await (await contract.connect(farmer).listOnMarket(batchId, seed.pricePerKg)).wait();
      const total = await contract.totalPrice(batchId);
      await (await contract.connect(buyer).purchase(batchId, { value: total })).wait();
      await (await contract.connect(buyer).confirmReceipt(batchId, "Pune Wholesale Market")).wait();
      console.log(`       💰 sold & settled for ${ethers.formatEther(total)} ETH`);
    } else if (index === 1) {
      // Batch 2 sits in escrow / transit.
      await (await contract.connect(farmer).listOnMarket(batchId, seed.pricePerKg)).wait();
      const total = await contract.totalPrice(batchId);
      await (await contract.connect(buyer).purchase(batchId, { value: total })).wait();
      console.log(`       🚚 escrowed ${ethers.formatEther(total)} ETH, in transit`);
    } else {
      await (await contract.connect(farmer).listOnMarket(batchId, seed.pricePerKg)).wait();
      console.log(`       🏪 listed on market`);
    }
  }

  console.log(`\n    admin=${admin.address}`);
  console.log(`    farmer=${farmer.address}`);
  console.log(`    verifier=${verifier.address}`);
  console.log(`    distributor=${distributor.address}`);
  console.log(`    buyer=${buyer.address}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
