// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgriSupplyChain
 * @notice Farm-to-market traceability for agricultural produce.
 *
 *         Every physical batch of produce is minted as an ERC-721 token. The token's
 *         `tokenURI` points at the off-chain metadata document (IPFS / API) and the
 *         `dataHash` pins that document's exact bytes, so off-chain records cannot be
 *         rewritten without detection.
 *
 *         Three things live on chain:
 *           1. Provenance  — an append-only status history per batch.
 *           2. Attestation — quality reports signed by an authorised AI verifier.
 *           3. Settlement  — escrowed payment released when the buyer confirms receipt.
 *
 *         Roles:
 *           DEFAULT_ADMIN_ROLE — platform operator: grants roles, resolves disputes.
 *           FARMER_ROLE        — may register batches and list them for sale.
 *           AI_VERIFIER_ROLE   — may write quality attestations.
 *           DISTRIBUTOR_ROLE   — may move a sold batch through transit states.
 */
contract AgriSupplyChain is ERC721URIStorage, AccessControl, ReentrancyGuard {
    // --------------------------------------------------------------------- //
    // Roles                                                                 //
    // --------------------------------------------------------------------- //

    bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 public constant AI_VERIFIER_ROLE = keccak256("AI_VERIFIER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    // --------------------------------------------------------------------- //
    // Types                                                                 //
    // --------------------------------------------------------------------- //

    /// @dev Lifecycle of a batch. Progress is strictly forward-only.
    enum Status {
        Planted, // 0 — registered by the farmer, harvest recorded
        AIQualityVerified, // 1 — quality attestation written by the AI verifier
        ListedOnMarket, // 2 — offered for sale at a fixed price
        InTransit, // 3 — bought and escrowed, distributor is carrying it
        Sold, // 4 — buyer confirmed receipt, funds released, NFT transferred
        Cancelled // 5 — terminal failure state (refunded / delisted by admin)
    }

    struct Batch {
        uint256 id;
        address farmer;
        string cropType;
        uint256 quantityKg; // whole kilograms
        uint256 pricePerKg; // wei per kilogram
        Status status;
        uint16 qualityScore; // 0–100, zero until attested
        bool qualityVerified;
        bytes32 dataHash; // keccak256 of the off-chain metadata document
        uint64 createdAt;
        uint64 updatedAt;
        string origin; // human-readable farm location
    }

    struct StatusEvent {
        Status status;
        address actor;
        uint64 timestamp;
        string location;
        string note;
    }

    struct Escrow {
        address buyer;
        uint256 amount; // total wei held for this batch
        uint64 fundedAt;
        uint64 deadline; // after this the farmer may claim unilaterally
        bool funded;
        bool settled; // released or refunded — terminal
    }

    // --------------------------------------------------------------------- //
    // Storage                                                               //
    // --------------------------------------------------------------------- //

    uint256 private _nextBatchId = 1;

    mapping(uint256 => Batch) private _batches;
    mapping(uint256 => StatusEvent[]) private _history;
    mapping(uint256 => Escrow) private _escrows;
    mapping(address => uint256[]) private _batchesByFarmer;

    /// @notice Buyer confirmation window. After it lapses the farmer can claim escrow.
    uint64 public confirmationWindow = 7 days;

    /// @notice Minimum AI score for a batch to be considered market-ready.
    uint16 public qualityThreshold = 60;

    // --------------------------------------------------------------------- //
    // Events                                                                //
    // --------------------------------------------------------------------- //

    event BatchRegistered(
        uint256 indexed batchId,
        address indexed farmer,
        string cropType,
        uint256 quantityKg,
        uint256 pricePerKg,
        bytes32 dataHash,
        string metadataURI
    );
    event QualityAttested(
        uint256 indexed batchId,
        address indexed verifier,
        uint16 qualityScore,
        bool passed,
        string reportURI
    );
    event StatusUpdated(
        uint256 indexed batchId,
        Status indexed previous,
        Status indexed current,
        address actor,
        string location,
        string note
    );
    event BatchListed(uint256 indexed batchId, uint256 pricePerKg, uint256 totalPrice);
    event EscrowFunded(uint256 indexed batchId, address indexed buyer, uint256 amount, uint64 deadline);
    event EscrowReleased(uint256 indexed batchId, address indexed to, uint256 amount);
    event EscrowRefunded(uint256 indexed batchId, address indexed to, uint256 amount);
    event MetadataUpdated(uint256 indexed batchId, bytes32 dataHash, string metadataURI);

    // --------------------------------------------------------------------- //
    // Errors                                                                //
    // --------------------------------------------------------------------- //

    error UnknownBatch(uint256 batchId);
    error NotBatchFarmer(uint256 batchId, address caller);
    error InvalidTransition(Status from, Status to);
    error BatchNotListed(uint256 batchId);
    error AlreadyFunded(uint256 batchId);
    error NoEscrow(uint256 batchId);
    error EscrowAlreadySettled(uint256 batchId);
    error IncorrectPayment(uint256 expected, uint256 received);
    error NotEscrowBuyer(uint256 batchId, address caller);
    error MustSettleViaConfirmReceipt(uint256 batchId);
    error ConfirmationWindowOpen(uint64 deadline);
    error QualityBelowThreshold(uint16 score, uint16 threshold);
    error EmptyValue(string field);
    error TransferFailed(address to, uint256 amount);

    // --------------------------------------------------------------------- //
    // Construction                                                          //
    // --------------------------------------------------------------------- //

    /**
     * @param admin        platform operator; also seeded with every operational role
     *                     so a single-signer local/dev deployment works out of the box.
     */
    constructor(address admin) ERC721("AgriChain Trace Batch", "AGT") {
        if (admin == address(0)) revert EmptyValue("admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FARMER_ROLE, admin);
        _grantRole(AI_VERIFIER_ROLE, admin);
        _grantRole(DISTRIBUTOR_ROLE, admin);
    }

    // --------------------------------------------------------------------- //
    // Modifiers                                                             //
    // --------------------------------------------------------------------- //

    modifier batchExists(uint256 batchId) {
        if (_batches[batchId].id == 0) revert UnknownBatch(batchId);
        _;
    }

    // --------------------------------------------------------------------- //
    // 1. Registration — mint one NFT per physical batch                     //
    // --------------------------------------------------------------------- //

    /**
     * @notice Register a batch of produce and mint its traceability NFT.
     * @dev    Callable by a farmer for themselves, or by the platform operator on
     *         behalf of a farmer who has no gas (custodial onboarding).
     * @param farmer       owner of the batch and recipient of the NFT
     * @param cropType     e.g. "Potatoes"
     * @param quantityKg   harvested weight in whole kilograms
     * @param pricePerKg   asking price in wei per kilogram
     * @param metadataURI  off-chain metadata document (ipfs://… or https://…)
     * @param dataHash     keccak256 of that document's bytes
     * @param origin       human-readable farm location
     * @return batchId     both the batch id and the ERC-721 token id
     */
    function registerBatch(
        address farmer,
        string calldata cropType,
        uint256 quantityKg,
        uint256 pricePerKg,
        string calldata metadataURI,
        bytes32 dataHash,
        string calldata origin
    ) external returns (uint256 batchId) {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            _checkRole(FARMER_ROLE, msg.sender);
            // A farmer may only register batches in their own name.
            if (farmer != msg.sender) revert NotBatchFarmer(0, msg.sender);
        }
        if (farmer == address(0)) revert EmptyValue("farmer");
        if (bytes(cropType).length == 0) revert EmptyValue("cropType");
        if (quantityKg == 0) revert EmptyValue("quantityKg");

        batchId = _nextBatchId++;

        _batches[batchId] = Batch({
            id: batchId,
            farmer: farmer,
            cropType: cropType,
            quantityKg: quantityKg,
            pricePerKg: pricePerKg,
            status: Status.Planted,
            qualityScore: 0,
            qualityVerified: false,
            dataHash: dataHash,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp),
            origin: origin
        });
        _batchesByFarmer[farmer].push(batchId);

        _safeMint(farmer, batchId);
        _setTokenURI(batchId, metadataURI);

        _history[batchId].push(
            StatusEvent({
                status: Status.Planted,
                actor: msg.sender,
                timestamp: uint64(block.timestamp),
                location: origin,
                note: "Batch registered at farm"
            })
        );

        emit BatchRegistered(batchId, farmer, cropType, quantityKg, pricePerKg, dataHash, metadataURI);
    }

    /// @notice Re-point a batch at an updated metadata document (e.g. after AI report attached).
    function setBatchMetadata(uint256 batchId, string calldata metadataURI, bytes32 dataHash)
        external
        batchExists(batchId)
    {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender) && _batches[batchId].farmer != msg.sender) {
            revert NotBatchFarmer(batchId, msg.sender);
        }
        _batches[batchId].dataHash = dataHash;
        _batches[batchId].updatedAt = uint64(block.timestamp);
        _setTokenURI(batchId, metadataURI);
        emit MetadataUpdated(batchId, dataHash, metadataURI);
    }

    // --------------------------------------------------------------------- //
    // 2. Quality attestation — written only by the AI verifier              //
    // --------------------------------------------------------------------- //

    /**
     * @notice Record an AI quality assessment for a batch.
     * @dev    Passing the threshold advances the batch to `AIQualityVerified`.
     *         A failing score is still recorded (transparency) but does not advance state.
     */
    function recordQualityAssessment(
        uint256 batchId,
        uint16 qualityScore,
        string calldata reportURI
    ) external onlyRole(AI_VERIFIER_ROLE) batchExists(batchId) {
        require(qualityScore <= 100, "score > 100");
        Batch storage batch = _batches[batchId];

        batch.qualityScore = qualityScore;
        batch.updatedAt = uint64(block.timestamp);

        bool passed = qualityScore >= qualityThreshold;
        batch.qualityVerified = passed;

        if (passed && batch.status == Status.Planted) {
            _writeStatus(batchId, Status.AIQualityVerified, batch.origin, "AI quality check passed");
        }

        emit QualityAttested(batchId, msg.sender, qualityScore, passed, reportURI);
    }

    // --------------------------------------------------------------------- //
    // 3. Status transitions                                                 //
    // --------------------------------------------------------------------- //

    /**
     * @notice Advance a batch to a new lifecycle state.
     * @dev    Authorisation is per-transition:
     *           → AIQualityVerified : AI_VERIFIER_ROLE (normally via recordQualityAssessment)
     *           → ListedOnMarket    : batch farmer (see listOnMarket) or admin
     *           → InTransit         : DISTRIBUTOR_ROLE or admin
     *           → Sold              : escrow buyer (see confirmReceipt) or admin
     *           → Cancelled         : admin only
     */
    function updateStatus(
        uint256 batchId,
        Status newStatus,
        string calldata location,
        string calldata note
    ) external batchExists(batchId) {
        Batch storage batch = _batches[batchId];
        _assertTransitionAllowed(batch.status, newStatus);

        bool isAdmin = hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        if (!isAdmin) {
            if (newStatus == Status.AIQualityVerified) {
                _checkRole(AI_VERIFIER_ROLE, msg.sender);
            } else if (newStatus == Status.ListedOnMarket) {
                if (batch.farmer != msg.sender) revert NotBatchFarmer(batchId, msg.sender);
            } else if (newStatus == Status.InTransit) {
                _checkRole(DISTRIBUTOR_ROLE, msg.sender);
            } else if (newStatus == Status.Sold) {
                if (_escrows[batchId].buyer != msg.sender) revert NotEscrowBuyer(batchId, msg.sender);
            } else {
                revert InvalidTransition(batch.status, newStatus);
            }
        }

        // Money must not be stranded: a funded escrow can only be resolved through
        // confirmReceipt / refundEscrow, never by a bare status write.
        if (newStatus == Status.Sold && _escrows[batchId].funded && !_escrows[batchId].settled) {
            revert MustSettleViaConfirmReceipt(batchId);
        }

        _writeStatus(batchId, newStatus, location, note);
    }

    /// @notice Farmer offers a verified batch for sale at a (possibly revised) price.
    function listOnMarket(uint256 batchId, uint256 pricePerKg) external batchExists(batchId) {
        Batch storage batch = _batches[batchId];
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender) && batch.farmer != msg.sender) {
            revert NotBatchFarmer(batchId, msg.sender);
        }
        if (!batch.qualityVerified) revert QualityBelowThreshold(batch.qualityScore, qualityThreshold);
        _assertTransitionAllowed(batch.status, Status.ListedOnMarket);
        if (pricePerKg == 0) revert EmptyValue("pricePerKg");

        batch.pricePerKg = pricePerKg;
        _writeStatus(batchId, Status.ListedOnMarket, batch.origin, "Listed on AgriChain market");
        emit BatchListed(batchId, pricePerKg, totalPrice(batchId));
    }

    // --------------------------------------------------------------------- //
    // 4. Escrowed settlement                                               //
    // --------------------------------------------------------------------- //

    /// @notice Total ask for a batch: quantity × unit price, in wei.
    function totalPrice(uint256 batchId) public view batchExists(batchId) returns (uint256) {
        Batch storage batch = _batches[batchId];
        return batch.quantityKg * batch.pricePerKg;
    }

    /**
     * @notice Buy a listed batch. Funds are held by this contract, not the farmer.
     * @dev    Advances the batch to `InTransit`. The NFT stays with the farmer until
     *         the buyer confirms physical receipt.
     */
    function purchase(uint256 batchId) external payable nonReentrant batchExists(batchId) {
        Batch storage batch = _batches[batchId];
        if (batch.status != Status.ListedOnMarket) revert BatchNotListed(batchId);
        if (_escrows[batchId].funded) revert AlreadyFunded(batchId);

        uint256 expected = totalPrice(batchId);
        if (msg.value != expected) revert IncorrectPayment(expected, msg.value);

        uint64 deadline = uint64(block.timestamp) + confirmationWindow;
        _escrows[batchId] = Escrow({
            buyer: msg.sender,
            amount: msg.value,
            fundedAt: uint64(block.timestamp),
            deadline: deadline,
            funded: true,
            settled: false
        });

        _writeStatus(batchId, Status.InTransit, batch.origin, "Payment escrowed, batch in transit");
        emit EscrowFunded(batchId, msg.sender, msg.value, deadline);
    }

    /**
     * @notice Buyer confirms the produce arrived: escrow pays the farmer and the
     *         traceability NFT transfers to the buyer.
     */
    function confirmReceipt(uint256 batchId, string calldata location)
        external
        nonReentrant
        batchExists(batchId)
    {
        Escrow storage escrow = _escrows[batchId];
        if (!escrow.funded) revert NoEscrow(batchId);
        if (escrow.settled) revert EscrowAlreadySettled(batchId);
        if (escrow.buyer != msg.sender && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotEscrowBuyer(batchId, msg.sender);
        }

        _settle(batchId, location, "Buyer confirmed receipt");
    }

    /**
     * @notice Farmer claims escrow once the confirmation window has lapsed without
     *         the buyer either confirming or disputing.
     */
    function claimExpiredEscrow(uint256 batchId) external nonReentrant batchExists(batchId) {
        Escrow storage escrow = _escrows[batchId];
        if (!escrow.funded) revert NoEscrow(batchId);
        if (escrow.settled) revert EscrowAlreadySettled(batchId);
        if (block.timestamp < escrow.deadline) revert ConfirmationWindowOpen(escrow.deadline);
        if (_batches[batchId].farmer != msg.sender && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotBatchFarmer(batchId, msg.sender);
        }

        _settle(batchId, _batches[batchId].origin, "Confirmation window expired, auto-released");
    }

    /**
     * @notice Platform operator refunds the buyer (spoilage, dispute, non-delivery).
     *         The batch is marked `Cancelled` and the NFT stays with the farmer.
     */
    function refundEscrow(uint256 batchId, string calldata reason)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
        batchExists(batchId)
    {
        Escrow storage escrow = _escrows[batchId];
        if (!escrow.funded) revert NoEscrow(batchId);
        if (escrow.settled) revert EscrowAlreadySettled(batchId);

        escrow.settled = true;
        uint256 amount = escrow.amount;
        address buyer = escrow.buyer;

        _writeStatus(batchId, Status.Cancelled, _batches[batchId].origin, reason);

        (bool ok, ) = payable(buyer).call{value: amount}("");
        if (!ok) revert TransferFailed(buyer, amount);

        emit EscrowRefunded(batchId, buyer, amount);
    }

    // --------------------------------------------------------------------- //
    // Views                                                                 //
    // --------------------------------------------------------------------- //

    function getBatch(uint256 batchId) external view batchExists(batchId) returns (Batch memory) {
        return _batches[batchId];
    }

    function getHistory(uint256 batchId) external view batchExists(batchId) returns (StatusEvent[] memory) {
        return _history[batchId];
    }

    function getEscrow(uint256 batchId) external view batchExists(batchId) returns (Escrow memory) {
        return _escrows[batchId];
    }

    function getBatchesByFarmer(address farmer) external view returns (uint256[] memory) {
        return _batchesByFarmer[farmer];
    }

    function totalBatches() external view returns (uint256) {
        return _nextBatchId - 1;
    }

    // --------------------------------------------------------------------- //
    // Admin knobs                                                           //
    // --------------------------------------------------------------------- //

    function setConfirmationWindow(uint64 seconds_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(seconds_ >= 1 hours && seconds_ <= 60 days, "window out of range");
        confirmationWindow = seconds_;
    }

    function setQualityThreshold(uint16 threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(threshold <= 100, "threshold > 100");
        qualityThreshold = threshold;
    }

    // --------------------------------------------------------------------- //
    // Internals                                                             //
    // --------------------------------------------------------------------- //

    function _settle(uint256 batchId, string memory location, string memory note) private {
        Escrow storage escrow = _escrows[batchId];
        escrow.settled = true;

        uint256 amount = escrow.amount;
        address farmer = _batches[batchId].farmer;
        address buyer = escrow.buyer;

        _writeStatus(batchId, Status.Sold, location, note);

        // Ownership of the traceability record follows the produce.
        _transfer(farmer, buyer, batchId);

        (bool ok, ) = payable(farmer).call{value: amount}("");
        if (!ok) revert TransferFailed(farmer, amount);

        emit EscrowReleased(batchId, farmer, amount);
    }

    function _writeStatus(
        uint256 batchId,
        Status newStatus,
        string memory location,
        string memory note
    ) private {
        Batch storage batch = _batches[batchId];
        Status previous = batch.status;
        batch.status = newStatus;
        batch.updatedAt = uint64(block.timestamp);

        _history[batchId].push(
            StatusEvent({
                status: newStatus,
                actor: msg.sender,
                timestamp: uint64(block.timestamp),
                location: location,
                note: note
            })
        );

        emit StatusUpdated(batchId, previous, newStatus, msg.sender, location, note);
    }

    /// @dev Forward-only lifecycle; `Cancelled` is reachable from any live state.
    function _assertTransitionAllowed(Status from, Status to) private pure {
        if (to == Status.Cancelled) {
            if (from == Status.Sold || from == Status.Cancelled) revert InvalidTransition(from, to);
            return;
        }
        if (uint8(to) != uint8(from) + 1) revert InvalidTransition(from, to);
    }

    // --------------------------------------------------------------------- //
    // Overrides                                                             //
    // --------------------------------------------------------------------- //

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
