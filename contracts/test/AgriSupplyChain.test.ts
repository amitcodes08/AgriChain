import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { AgriSupplyChain } from "../typechain-types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const Status = {
  Planted: 0,
  AIQualityVerified: 1,
  ListedOnMarket: 2,
  InTransit: 3,
  Sold: 4,
  Cancelled: 5,
} as const;

describe("AgriSupplyChain", () => {
  let contract: AgriSupplyChain;
  let admin: HardhatEthersSigner;
  let farmer: HardhatEthersSigner;
  let verifier: HardhatEthersSigner;
  let distributor: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;

  const KG = 1000n;
  const PRICE_PER_KG = ethers.parseEther("0.001");
  const TOTAL = KG * PRICE_PER_KG;
  const META = "ipfs://batch/1.json";
  const HASH = ethers.keccak256(ethers.toUtf8Bytes("potatoes-1000kg"));

  beforeEach(async () => {
    [admin, farmer, verifier, distributor, buyer, outsider] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("AgriSupplyChain");
    contract = await factory.deploy(admin.address);
    await contract.waitForDeployment();

    await contract.grantRole(await contract.FARMER_ROLE(), farmer.address);
    await contract.grantRole(await contract.AI_VERIFIER_ROLE(), verifier.address);
    await contract.grantRole(await contract.DISTRIBUTOR_ROLE(), distributor.address);
  });

  async function registerBatch() {
    await contract
      .connect(farmer)
      .registerBatch(farmer.address, "Potatoes", KG, PRICE_PER_KG, META, HASH, "Nashik");
    return 1n;
  }

  describe("registration", () => {
    it("mints one NFT per batch and records provenance", async () => {
      const batchId = await registerBatch();

      expect(await contract.ownerOf(batchId)).to.equal(farmer.address);
      expect(await contract.tokenURI(batchId)).to.equal(META);
      expect(await contract.totalBatches()).to.equal(1n);

      const batch = await contract.getBatch(batchId);
      expect(batch.cropType).to.equal("Potatoes");
      expect(batch.quantityKg).to.equal(KG);
      expect(batch.status).to.equal(Status.Planted);
      expect(batch.dataHash).to.equal(HASH);
      expect(batch.qualityVerified).to.equal(false);

      const history = await contract.getHistory(batchId);
      expect(history.length).to.equal(1);
      expect(history[0].status).to.equal(Status.Planted);
    });

    it("emits BatchRegistered with the metadata pin", async () => {
      await expect(
        contract.connect(farmer).registerBatch(farmer.address, "Wheat", KG, PRICE_PER_KG, META, HASH, "Ludhiana"),
      )
        .to.emit(contract, "BatchRegistered")
        .withArgs(1n, farmer.address, "Wheat", KG, PRICE_PER_KG, HASH, META);
    });

    it("lets the operator register on behalf of a farmer (custodial onboarding)", async () => {
      await contract.connect(admin).registerBatch(farmer.address, "Rice", KG, PRICE_PER_KG, META, HASH, "Thanjavur");
      expect(await contract.ownerOf(1n)).to.equal(farmer.address);
    });

    it("rejects registration from an account without FARMER_ROLE", async () => {
      await expect(
        contract.connect(outsider).registerBatch(outsider.address, "Potatoes", KG, PRICE_PER_KG, META, HASH, "X"),
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("stops a farmer registering a batch in someone else's name", async () => {
      await expect(
        contract.connect(farmer).registerBatch(outsider.address, "Potatoes", KG, PRICE_PER_KG, META, HASH, "X"),
      ).to.be.revertedWithCustomError(contract, "NotBatchFarmer");
    });

    it("rejects an empty crop type and zero quantity", async () => {
      await expect(
        contract.connect(farmer).registerBatch(farmer.address, "", KG, PRICE_PER_KG, META, HASH, "X"),
      ).to.be.revertedWithCustomError(contract, "EmptyValue");
      await expect(
        contract.connect(farmer).registerBatch(farmer.address, "Potatoes", 0n, PRICE_PER_KG, META, HASH, "X"),
      ).to.be.revertedWithCustomError(contract, "EmptyValue");
    });

    it("indexes batches per farmer", async () => {
      await registerBatch();
      await contract.connect(farmer).registerBatch(farmer.address, "Wheat", KG, PRICE_PER_KG, META, HASH, "Nashik");
      expect(await contract.getBatchesByFarmer(farmer.address)).to.deep.equal([1n, 2n]);
    });
  });

  describe("quality attestation", () => {
    it("advances to AIQualityVerified when the score clears the threshold", async () => {
      const batchId = await registerBatch();
      await expect(contract.connect(verifier).recordQualityAssessment(batchId, 92, "ipfs://report/1.json"))
        .to.emit(contract, "QualityAttested")
        .withArgs(batchId, verifier.address, 92, true, "ipfs://report/1.json");

      const batch = await contract.getBatch(batchId);
      expect(batch.status).to.equal(Status.AIQualityVerified);
      expect(batch.qualityScore).to.equal(92);
      expect(batch.qualityVerified).to.equal(true);
    });

    it("records a failing score without advancing state", async () => {
      const batchId = await registerBatch();
      await contract.connect(verifier).recordQualityAssessment(batchId, 41, "ipfs://report/1.json");

      const batch = await contract.getBatch(batchId);
      expect(batch.status).to.equal(Status.Planted);
      expect(batch.qualityScore).to.equal(41);
      expect(batch.qualityVerified).to.equal(false);
    });

    it("only the AI verifier may attest", async () => {
      const batchId = await registerBatch();
      await expect(
        contract.connect(farmer).recordQualityAssessment(batchId, 99, "ipfs://x"),
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("rejects a score above 100", async () => {
      const batchId = await registerBatch();
      await expect(contract.connect(verifier).recordQualityAssessment(batchId, 101, "x")).to.be.revertedWith(
        "score > 100",
      );
    });

    it("reverts for an unknown batch", async () => {
      await expect(
        contract.connect(verifier).recordQualityAssessment(999n, 90, "x"),
      ).to.be.revertedWithCustomError(contract, "UnknownBatch");
    });
  });

  describe("listing", () => {
    it("requires a passing quality attestation before listing", async () => {
      const batchId = await registerBatch();
      await expect(
        contract.connect(farmer).listOnMarket(batchId, PRICE_PER_KG),
      ).to.be.revertedWithCustomError(contract, "QualityBelowThreshold");
    });

    it("lists a verified batch and re-prices it", async () => {
      const batchId = await registerBatch();
      await contract.connect(verifier).recordQualityAssessment(batchId, 90, "x");

      const newPrice = ethers.parseEther("0.002");
      await expect(contract.connect(farmer).listOnMarket(batchId, newPrice))
        .to.emit(contract, "BatchListed")
        .withArgs(batchId, newPrice, KG * newPrice);

      expect((await contract.getBatch(batchId)).status).to.equal(Status.ListedOnMarket);
      expect(await contract.totalPrice(batchId)).to.equal(KG * newPrice);
    });

    it("blocks a non-owner from listing", async () => {
      const batchId = await registerBatch();
      await contract.connect(verifier).recordQualityAssessment(batchId, 90, "x");
      await expect(
        contract.connect(outsider).listOnMarket(batchId, PRICE_PER_KG),
      ).to.be.revertedWithCustomError(contract, "NotBatchFarmer");
    });
  });

  describe("status transitions", () => {
    it("is forward-only", async () => {
      const batchId = await registerBatch();
      await contract.connect(verifier).recordQualityAssessment(batchId, 90, "x");
      // AIQualityVerified → Sold skips two states.
      await expect(
        contract.connect(admin).updateStatus(batchId, Status.Sold, "Pune", "skip"),
      ).to.be.revertedWithCustomError(contract, "InvalidTransition");
    });

    it("lets a distributor move a listed batch into transit", async () => {
      const batchId = await registerBatch();
      await contract.connect(verifier).recordQualityAssessment(batchId, 90, "x");
      await contract.connect(farmer).listOnMarket(batchId, PRICE_PER_KG);

      await expect(contract.connect(distributor).updateStatus(batchId, Status.InTransit, "NH-60", "picked up"))
        .to.emit(contract, "StatusUpdated")
        .withArgs(batchId, Status.ListedOnMarket, Status.InTransit, distributor.address, "NH-60", "picked up");
    });

    it("blocks an unauthorised transit update", async () => {
      const batchId = await registerBatch();
      await contract.connect(verifier).recordQualityAssessment(batchId, 90, "x");
      await contract.connect(farmer).listOnMarket(batchId, PRICE_PER_KG);
      await expect(
        contract.connect(outsider).updateStatus(batchId, Status.InTransit, "x", "y"),
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("appends every transition to the on-chain history", async () => {
      const batchId = await registerBatch();
      await contract.connect(verifier).recordQualityAssessment(batchId, 90, "x");
      await contract.connect(farmer).listOnMarket(batchId, PRICE_PER_KG);

      const history = await contract.getHistory(batchId);
      expect(history.map((event) => Number(event.status))).to.deep.equal([
        Status.Planted,
        Status.AIQualityVerified,
        Status.ListedOnMarket,
      ]);
    });
  });

  describe("escrow", () => {
    async function listedBatch() {
      const batchId = await registerBatch();
      await contract.connect(verifier).recordQualityAssessment(batchId, 90, "x");
      await contract.connect(farmer).listOnMarket(batchId, PRICE_PER_KG);
      return batchId;
    }

    it("holds the buyer's funds in the contract, not the farmer's wallet", async () => {
      const batchId = await listedBatch();
      const farmerBefore = await ethers.provider.getBalance(farmer.address);

      await expect(contract.connect(buyer).purchase(batchId, { value: TOTAL })).to.emit(contract, "EscrowFunded");

      expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(TOTAL);
      expect(await ethers.provider.getBalance(farmer.address)).to.equal(farmerBefore);
      expect((await contract.getBatch(batchId)).status).to.equal(Status.InTransit);

      const escrow = await contract.getEscrow(batchId);
      expect(escrow.buyer).to.equal(buyer.address);
      expect(escrow.amount).to.equal(TOTAL);
      expect(escrow.funded).to.equal(true);
      expect(escrow.settled).to.equal(false);
    });

    it("rejects an incorrect payment amount", async () => {
      const batchId = await listedBatch();
      await expect(
        contract.connect(buyer).purchase(batchId, { value: TOTAL - 1n }),
      ).to.be.revertedWithCustomError(contract, "IncorrectPayment");
    });

    it("rejects a purchase of a batch that is not listed", async () => {
      const batchId = await registerBatch();
      await expect(
        contract.connect(buyer).purchase(batchId, { value: TOTAL }),
      ).to.be.revertedWithCustomError(contract, "BatchNotListed");
    });

    it("rejects a second purchase of the same batch", async () => {
      const batchId = await listedBatch();
      await contract.connect(buyer).purchase(batchId, { value: TOTAL });
      await expect(
        contract.connect(outsider).purchase(batchId, { value: TOTAL }),
      ).to.be.revertedWithCustomError(contract, "BatchNotListed");
    });

    it("releases funds and transfers the NFT when the buyer confirms receipt", async () => {
      const batchId = await listedBatch();
      await contract.connect(buyer).purchase(batchId, { value: TOTAL });

      const farmerBefore = await ethers.provider.getBalance(farmer.address);
      await expect(contract.connect(buyer).confirmReceipt(batchId, "Pune Wholesale Market"))
        .to.emit(contract, "EscrowReleased")
        .withArgs(batchId, farmer.address, TOTAL);

      expect(await ethers.provider.getBalance(farmer.address)).to.equal(farmerBefore + TOTAL);
      expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(0n);
      expect(await contract.ownerOf(batchId)).to.equal(buyer.address);
      expect((await contract.getBatch(batchId)).status).to.equal(Status.Sold);
      expect((await contract.getEscrow(batchId)).settled).to.equal(true);
    });

    it("only the buyer (or operator) can confirm receipt", async () => {
      const batchId = await listedBatch();
      await contract.connect(buyer).purchase(batchId, { value: TOTAL });
      await expect(
        contract.connect(outsider).confirmReceipt(batchId, "x"),
      ).to.be.revertedWithCustomError(contract, "NotEscrowBuyer");
    });

    it("cannot be double-settled", async () => {
      const batchId = await listedBatch();
      await contract.connect(buyer).purchase(batchId, { value: TOTAL });
      await contract.connect(buyer).confirmReceipt(batchId, "x");
      await expect(
        contract.connect(buyer).confirmReceipt(batchId, "x"),
      ).to.be.revertedWithCustomError(contract, "EscrowAlreadySettled");
    });

    it("cannot be bypassed with a bare status write while funded", async () => {
      const batchId = await listedBatch();
      await contract.connect(buyer).purchase(batchId, { value: TOTAL });
      await expect(
        contract.connect(admin).updateStatus(batchId, Status.Sold, "x", "y"),
      ).to.be.revertedWithCustomError(contract, "MustSettleViaConfirmReceipt");
    });

    it("lets the farmer claim once the confirmation window lapses", async () => {
      const batchId = await listedBatch();
      await contract.connect(buyer).purchase(batchId, { value: TOTAL });

      await expect(
        contract.connect(farmer).claimExpiredEscrow(batchId),
      ).to.be.revertedWithCustomError(contract, "ConfirmationWindowOpen");

      await time.increase(7 * 24 * 60 * 60 + 1);

      const farmerBefore = await ethers.provider.getBalance(farmer.address);
      const tx = await contract.connect(farmer).claimExpiredEscrow(batchId);
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * receipt!.gasPrice;

      expect(await ethers.provider.getBalance(farmer.address)).to.equal(farmerBefore + TOTAL - gas);
      expect(await contract.ownerOf(batchId)).to.equal(buyer.address);
    });

    it("refunds the buyer on an operator-resolved dispute", async () => {
      const batchId = await listedBatch();
      await contract.connect(buyer).purchase(batchId, { value: TOTAL });

      const buyerBefore = await ethers.provider.getBalance(buyer.address);
      await expect(contract.connect(admin).refundEscrow(batchId, "Spoiled in transit"))
        .to.emit(contract, "EscrowRefunded")
        .withArgs(batchId, buyer.address, TOTAL);

      expect(await ethers.provider.getBalance(buyer.address)).to.equal(buyerBefore + TOTAL);
      expect((await contract.getBatch(batchId)).status).to.equal(Status.Cancelled);
      // Produce never changed hands, so the record stays with the farmer.
      expect(await contract.ownerOf(batchId)).to.equal(farmer.address);
    });

    it("only the operator may refund", async () => {
      const batchId = await listedBatch();
      await contract.connect(buyer).purchase(batchId, { value: TOTAL });
      await expect(
        contract.connect(buyer).refundEscrow(batchId, "give it back"),
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });
  });

  describe("admin knobs", () => {
    it("updates the quality threshold", async () => {
      await contract.connect(admin).setQualityThreshold(85);
      expect(await contract.qualityThreshold()).to.equal(85);

      const batchId = await registerBatch();
      await contract.connect(verifier).recordQualityAssessment(batchId, 80, "x");
      expect((await contract.getBatch(batchId)).qualityVerified).to.equal(false);
    });

    it("bounds the confirmation window", async () => {
      await expect(contract.connect(admin).setConfirmationWindow(60)).to.be.revertedWith("window out of range");
      await contract.connect(admin).setConfirmationWindow(48 * 60 * 60);
      expect(await contract.confirmationWindow()).to.equal(48 * 60 * 60);
    });

    it("gates knobs behind the admin role", async () => {
      await expect(
        contract.connect(farmer).setQualityThreshold(10),
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });
  });

  describe("metadata", () => {
    it("lets the farmer re-pin metadata after the AI report is attached", async () => {
      const batchId = await registerBatch();
      const newURI = "ipfs://batch/1-with-report.json";
      const newHash = ethers.keccak256(ethers.toUtf8Bytes("with-report"));

      await expect(contract.connect(farmer).setBatchMetadata(batchId, newURI, newHash))
        .to.emit(contract, "MetadataUpdated")
        .withArgs(batchId, newHash, newURI);

      expect(await contract.tokenURI(batchId)).to.equal(newURI);
      expect((await contract.getBatch(batchId)).dataHash).to.equal(newHash);
    });

    it("blocks an outsider from re-pinning metadata", async () => {
      const batchId = await registerBatch();
      await expect(
        contract.connect(outsider).setBatchMetadata(batchId, "ipfs://evil", HASH),
      ).to.be.revertedWithCustomError(contract, "NotBatchFarmer");
    });
  });

  it("advertises ERC-721 and AccessControl interfaces", async () => {
    expect(await contract.supportsInterface("0x80ac58cd")).to.equal(true); // ERC721
    expect(await contract.supportsInterface("0x7965db0b")).to.equal(true); // AccessControl
  });
});
