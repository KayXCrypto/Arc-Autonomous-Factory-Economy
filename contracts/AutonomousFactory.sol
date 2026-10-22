// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract AutonomousFactory is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    enum OrderStatus {
        PENDING,
        FUNDED,
        ACCEPTED,
        SHIPPED,
        DELIVERED,
        RELEASED,
        DISPUTED,
        RESOLVED,
        REFUNDED,
        CANCELLED
    }

    struct PurchaseOrder {
        uint256 id;
        address buyer;
        address supplier;
        uint256 usdcAmount;
        uint256 platformFee;
        bytes32 productHash;
        string productDescription;
        uint256 createdAt;
        uint256 acceptDeadline;
        uint256 deliveryDeadline;
        uint256 disputeDeadline;
        OrderStatus status;
        string trackingInfo;
        string disputeReason;
    }

    struct AgentReputation {
        uint256 totalOrders;
        uint256 completedOrders;
        uint256 disputedOrders;
        uint256 totalVolumeUsdc;
        uint256 reputationScore;
    }

    IERC20 public immutable usdc;

    uint256 public constant MAX_PLATFORM_FEE_BPS = 500;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant DISPUTE_TIMEOUT = 7 days;
    uint256 public constant SUPPLIER_CLAIM_GRACE = 3 days;

    uint256 public platformFeeBps = 100;
    uint256 public nextOrderId = 1;

    address public verifier;

    mapping(uint256 => PurchaseOrder) private orders;
    mapping(address => uint256[]) private buyerOrders;
    mapping(address => uint256[]) private supplierOrders;
    mapping(address => AgentReputation) public agentReputation;
    mapping(address => uint256) public pendingWithdrawals;

    event OrderCreated(
        uint256 indexed orderId,
        address indexed buyer,
        address indexed supplier,
        uint256 amount,
        uint256 acceptDeadline,
        uint256 deliveryDeadline
    );
    event OrderFunded(uint256 indexed orderId, address indexed buyer, uint256 amount);
    event OrderAccepted(uint256 indexed orderId, address indexed supplier);
    event OrderShipped(uint256 indexed orderId, address indexed supplier, string trackingInfo);
    event OrderDelivered(uint256 indexed orderId, address indexed buyer);
    event PaymentReleased(
        uint256 indexed orderId,
        address indexed supplier,
        uint256 supplierAmount,
        uint256 platformFee
    );
    event OrderDisputed(uint256 indexed orderId, address indexed buyer, string reason);
    event DisputeResolved(uint256 indexed orderId, bool releasedToSupplier, address indexed resolver);
    event OrderRefunded(uint256 indexed orderId, address indexed buyer, uint256 amount);
    event OrderCancelled(uint256 indexed orderId, address indexed buyer);
    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    error InvalidAddress();
    error InvalidAmount();
    error InvalidOrder();
    error Unauthorized();
    error InvalidStatus();
    error DeadlinePassed();
    error DeadlineNotReached();
    error InvalidDeadline();
    error FeeTooHigh();
    error OrderAlreadyShippedUseDispute();

    modifier onlyBuyer(uint256 orderId) {
        if (orders[orderId].buyer != msg.sender) revert Unauthorized();
        _;
    }

    modifier onlySupplier(uint256 orderId) {
        if (orders[orderId].supplier != msg.sender) revert Unauthorized();
        _;
    }

    modifier onlyResolver() {
        if (msg.sender != owner() && msg.sender != verifier) revert Unauthorized();
        _;
    }

    constructor(address usdcToken, address initialOwner) Ownable(initialOwner) {
        if (usdcToken == address(0) || initialOwner == address(0)) revert InvalidAddress();
        usdc = IERC20(usdcToken);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function createOrder(
        address supplier,
        uint256 amount,
        bytes32 productHash,
        string calldata description,
        uint256 acceptDeadlineSecs,
        uint256 deliveryDeadlineSecs
    ) external whenNotPaused returns (uint256 orderId) {
        if (supplier == address(0) || supplier == msg.sender) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (acceptDeadlineSecs == 0 || deliveryDeadlineSecs == 0) revert InvalidDeadline();
        if (deliveryDeadlineSecs <= acceptDeadlineSecs) revert InvalidDeadline();

        orderId = nextOrderId;
        nextOrderId = orderId + 1;

        uint256 createdAt = block.timestamp;
        uint256 acceptDeadline = createdAt + acceptDeadlineSecs;
        uint256 deliveryDeadline = createdAt + deliveryDeadlineSecs;
        uint256 feeAmount = (amount * platformFeeBps) / BPS_DENOMINATOR;

        PurchaseOrder storage order = orders[orderId];
        order.id = orderId;
        order.buyer = msg.sender;
        order.supplier = supplier;
        order.usdcAmount = amount;
        order.platformFee = feeAmount;
        order.productHash = productHash;
        order.productDescription = description;
        order.createdAt = createdAt;
        order.acceptDeadline = acceptDeadline;
        order.deliveryDeadline = deliveryDeadline;
        order.status = OrderStatus.PENDING;

        buyerOrders[msg.sender].push(orderId);
        supplierOrders[supplier].push(orderId);

        _recordOrderCreated(msg.sender, supplier);

        emit OrderCreated(orderId, msg.sender, supplier, amount, acceptDeadline, deliveryDeadline);
    }

    function fundOrder(uint256 orderId) external nonReentrant whenNotPaused onlyBuyer(orderId) {
        PurchaseOrder storage order = orders[orderId];
        if (order.id == 0) revert InvalidOrder();
        if (order.status != OrderStatus.PENDING) revert InvalidStatus();

        order.status = OrderStatus.FUNDED;
        usdc.safeTransferFrom(msg.sender, address(this), order.usdcAmount);

        emit OrderFunded(orderId, msg.sender, order.usdcAmount);
    }

    function acceptOrder(uint256 orderId) external whenNotPaused onlySupplier(orderId) {
        PurchaseOrder storage order = orders[orderId];
        if (order.id == 0) revert InvalidOrder();
        if (order.status != OrderStatus.FUNDED) revert InvalidStatus();
        if (block.timestamp > order.acceptDeadline) revert DeadlinePassed();

        order.status = OrderStatus.ACCEPTED;

        emit OrderAccepted(orderId, msg.sender);
    }

    function shipOrder(uint256 orderId, string calldata trackingInfo) external whenNotPaused onlySupplier(orderId) {
        PurchaseOrder storage order = orders[orderId];
        if (order.id == 0) revert InvalidOrder();
        if (order.status != OrderStatus.ACCEPTED) revert InvalidStatus();
        if (block.timestamp > order.deliveryDeadline) revert DeadlinePassed();

        order.status = OrderStatus.SHIPPED;
        order.trackingInfo = trackingInfo;

        emit OrderShipped(orderId, msg.sender, trackingInfo);
    }

    function confirmDelivery(uint256 orderId) external nonReentrant whenNotPaused onlyBuyer(orderId) {
        PurchaseOrder storage order = orders[orderId];
        if (order.id == 0) revert InvalidOrder();
        if (order.status != OrderStatus.SHIPPED) revert InvalidStatus();

        order.status = OrderStatus.DELIVERED;
        emit OrderDelivered(orderId, msg.sender);

        _releasePayment(orderId, order, false);
        _recordCompleted(order.buyer, order.supplier, order.usdcAmount);
    }

    function disputeOrder(uint256 orderId, string calldata reason) external whenNotPaused onlyBuyer(orderId) {
        PurchaseOrder storage order = orders[orderId];
        if (order.id == 0) revert InvalidOrder();
        if (order.status != OrderStatus.SHIPPED) revert InvalidStatus();

        order.status = OrderStatus.DISPUTED;
        order.disputeReason = reason;
        order.disputeDeadline = block.timestamp + DISPUTE_TIMEOUT;

        _recordDisputed(order.buyer, order.supplier);

        emit OrderDisputed(orderId, msg.sender, reason);
    }

    function resolveDispute(uint256 orderId, bool releaseToSupplier) external nonReentrant whenNotPaused onlyResolver {
        PurchaseOrder storage order = orders[orderId];
        if (order.id == 0) revert InvalidOrder();
        if (order.status != OrderStatus.DISPUTED) revert InvalidStatus();

        if (releaseToSupplier) {
            _releasePayment(orderId, order, true);
            _recordCompleted(order.buyer, order.supplier, order.usdcAmount);
            order.status = OrderStatus.RESOLVED;
        } else {
            order.status = OrderStatus.REFUNDED;
            pendingWithdrawals[order.buyer] += order.usdcAmount;
            emit OrderRefunded(orderId, order.buyer, order.usdcAmount);
        }

        emit DisputeResolved(orderId, releaseToSupplier, msg.sender);
    }

    function claimDisputeTimeout(uint256 orderId) external nonReentrant whenNotPaused {
        PurchaseOrder storage order = orders[orderId];
        if (order.id == 0) revert InvalidOrder();
        if (order.status != OrderStatus.DISPUTED) revert InvalidStatus();
        if (msg.sender != order.buyer && msg.sender != order.supplier) revert Unauthorized();
        if (block.timestamp <= order.disputeDeadline) revert DeadlineNotReached();

        order.status = OrderStatus.REFUNDED;
        pendingWithdrawals[order.buyer] += order.usdcAmount;

        emit OrderRefunded(orderId, order.buyer, order.usdcAmount);
    }

    function claimTimeout(uint256 orderId) external nonReentrant whenNotPaused {
        PurchaseOrder storage order = orders[orderId];
        if (order.id == 0) revert InvalidOrder();

        if (order.status == OrderStatus.FUNDED) {
            if (order.buyer != msg.sender) revert Unauthorized();
            if (block.timestamp <= order.acceptDeadline) revert DeadlineNotReached();
            order.status = OrderStatus.REFUNDED;
            usdc.safeTransfer(order.buyer, order.usdcAmount);
            emit OrderRefunded(orderId, order.buyer, order.usdcAmount);
            return;
        }

        if (order.status == OrderStatus.ACCEPTED) {
            if (order.buyer != msg.sender) revert Unauthorized();
            if (block.timestamp <= order.deliveryDeadline) revert DeadlineNotReached();
            order.status = OrderStatus.REFUNDED;
            usdc.safeTransfer(order.buyer, order.usdcAmount);
            emit OrderRefunded(orderId, order.buyer, order.usdcAmount);
            return;
        }

        if (order.status == OrderStatus.SHIPPED) {
            if (block.timestamp > order.deliveryDeadline + SUPPLIER_CLAIM_GRACE) {
                if (order.supplier != msg.sender) revert Unauthorized();
                _releasePayment(orderId, order, false);
                _recordCompleted(order.buyer, order.supplier, order.usdcAmount);
                return;
            }
            revert OrderAlreadyShippedUseDispute();
        }

        revert InvalidStatus();
    }

    function cancelOrder(uint256 orderId) external whenNotPaused onlyBuyer(orderId) {
        PurchaseOrder storage order = orders[orderId];
        if (order.id == 0) revert InvalidOrder();
        if (order.status != OrderStatus.PENDING) revert InvalidStatus();

        order.status = OrderStatus.CANCELLED;

        emit OrderCancelled(orderId, msg.sender);
    }

    /// @notice Supplier rejects a funded order, returning USDC to the buyer.
    function rejectOrder(uint256 orderId) external nonReentrant whenNotPaused onlySupplier(orderId) {
        PurchaseOrder storage order = orders[orderId];
        if (order.id == 0) revert InvalidOrder();
        if (order.status != OrderStatus.FUNDED) revert InvalidStatus();

        order.status = OrderStatus.REFUNDED;

        usdc.safeTransfer(order.buyer, order.usdcAmount);
        emit OrderRefunded(orderId, order.buyer, order.usdcAmount);
    }

    function setPlatformFee(uint256 feeBps) external onlyOwner {
        if (feeBps > MAX_PLATFORM_FEE_BPS) revert FeeTooHigh();

        uint256 oldFee = platformFeeBps;
        platformFeeBps = feeBps;

        emit PlatformFeeUpdated(oldFee, feeBps);
    }

    function setVerifier(address newVerifier) external onlyOwner {
        address oldVerifier = verifier;
        verifier = newVerifier;

        emit VerifierUpdated(oldVerifier, newVerifier);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert InvalidAmount();

        pendingWithdrawals[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);
    }

    function getOrder(uint256 orderId) external view returns (PurchaseOrder memory) {
        PurchaseOrder memory order = orders[orderId];
        if (order.id == 0) revert InvalidOrder();
        return order;
    }

    function getBuyerOrders(address buyer) external view returns (uint256[] memory) {
        return buyerOrders[buyer];
    }

    function getSupplierOrders(address supplier) external view returns (uint256[] memory) {
        return supplierOrders[supplier];
    }

    function _releasePayment(uint256 orderId, PurchaseOrder storage order, bool fromDispute) internal {
        uint256 fee = order.platformFee;
        uint256 payout = order.usdcAmount - fee;

        order.status = OrderStatus.RELEASED;

        pendingWithdrawals[order.supplier] += payout;
        if (fee > 0) {
            pendingWithdrawals[owner()] += fee;
        }

        emit PaymentReleased(orderId, order.supplier, payout, fee);

        if (fromDispute) {
            emit OrderDelivered(orderId, order.buyer);
        }
    }

    function _recordOrderCreated(address buyer, address supplier) internal {
        AgentReputation storage buyerRep = agentReputation[buyer];
        AgentReputation storage supplierRep = agentReputation[supplier];

        buyerRep.totalOrders += 1;
        supplierRep.totalOrders += 1;

        _refreshScore(buyerRep);
        _refreshScore(supplierRep);
    }

    function _recordCompleted(address buyer, address supplier, uint256 amount) internal {
        AgentReputation storage buyerRep = agentReputation[buyer];
        AgentReputation storage supplierRep = agentReputation[supplier];

        buyerRep.completedOrders += 1;
        supplierRep.completedOrders += 1;

        buyerRep.totalVolumeUsdc += amount;
        supplierRep.totalVolumeUsdc += amount;

        _refreshScore(buyerRep);
        _refreshScore(supplierRep);
    }

    function _recordDisputed(address buyer, address supplier) internal {
        AgentReputation storage buyerRep = agentReputation[buyer];
        AgentReputation storage supplierRep = agentReputation[supplier];

        buyerRep.disputedOrders += 1;
        supplierRep.disputedOrders += 1;

        _refreshScore(buyerRep);
        _refreshScore(supplierRep);
    }

    function _refreshScore(AgentReputation storage rep) internal {
        if (rep.totalOrders == 0) {
            rep.reputationScore = 0;
            return;
        }

        uint256 score = (rep.completedOrders * 1000) / rep.totalOrders;
        rep.reputationScore = score > 1000 ? 1000 : score;
    }
}
