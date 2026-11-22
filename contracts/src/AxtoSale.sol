// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IPriceFeed {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
    function decimals() external view returns (uint8);
}

/**
 * @title AxtoSale
 * @notice Presale 2.000.000 AXTO di harga stabil US$10 sampai habis.
 *  - `buyWithUSDC`: dari wallet mana pun (MetaMask, Trust Wallet), USDC langsung ke treasury.
 *  - `buyWithETH`: harga ETH/USD dari Chainlink (dicek kebaruannya), ETH langsung ke treasury.
 *  - `claimPaid`: pembeli PayPal mengklaim voucher bertanda tangan signer (gas oleh pembeli). Dibatasi `dailyCap`.
 *  Kontrak tidak pernah menyimpan dana pembeli.
 */
contract AxtoSale is Ownable2Step, Pausable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    bytes32 public constant VOUCHER_TYPEHASH =
        keccak256("CoinVoucher(address to,uint256 amount,bytes32 ref,uint256 deadline)");
    uint256 public constant CAP = 2_000_000 ether;
    uint256 public constant PRICE_USD = 10; // per AXTO

    IERC20 public immutable token;
    IERC20 public immutable usdc;
    IPriceFeed public immutable ethUsd;
    address public treasury;
    address public signer;
    uint256 public sold;
    uint256 public dailyCap = 50_000 ether;
    uint256 public maxFeedAge = 1 hours;
    mapping(uint256 => uint256) public voucherDay; // hari → jumlah voucher
    mapping(bytes32 => bool) public refUsed;

    event Bought(address indexed buyer, uint256 amount, address payToken, uint256 paid);
    event VoucherClaimed(address indexed to, uint256 amount, bytes32 ref);
    event VoucherCancelled(bytes32 ref);

    error SoldOut();
    error TooSmall();
    error Slippage();
    error StalePrice();
    error Expired();
    error RefUsed();
    error BadSignature();
    error DailyCap();

    constructor(address owner_, IERC20 token_, IERC20 usdc_, IPriceFeed ethUsd_, address treasury_, address signer_)
        Ownable(owner_)
        EIP712("AXTO Sale", "1")
    {
        require(treasury_ != address(0), "treasury");
        token = token_;
        usdc = usdc_;
        ethUsd = ethUsd_;
        treasury = treasury_;
        signer = signer_;
    }

    function remaining() external view returns (uint256) {
        return CAP - sold;
    }

    /// @notice Biaya USDC (6 desimal) untuk `amount` AXTO (18 desimal), dibulatkan ke atas.
    function quoteUSDC(uint256 amount) public pure returns (uint256) {
        return (amount * PRICE_USD * 1e6 + 1e18 - 1) / 1e18;
    }

    function buyWithUSDC(uint256 amount) external nonReentrant whenNotPaused {
        if (amount < 1e15) revert TooSmall();
        _reserve(amount);
        uint256 cost = quoteUSDC(amount);
        usdc.safeTransferFrom(msg.sender, treasury, cost);
        token.safeTransfer(msg.sender, amount);
        emit Bought(msg.sender, amount, address(usdc), cost);
    }

    function ethPrice() public view returns (uint256 price18) {
        (, int256 p,, uint256 updatedAt,) = ethUsd.latestRoundData();
        if (p <= 0 || block.timestamp - updatedAt > maxFeedAge) revert StalePrice();
        price18 = uint256(p) * 10 ** (18 - ethUsd.decimals());
    }

    function buyWithETH(uint256 minAmount) external payable nonReentrant whenNotPaused {
        _buyETH(minAmount);
    }

    /// @notice Beli manual dari wallet mana pun: kirim ETH (jaringan Base) ke alamat kontrak ini → AXTO otomatis masuk
    ///  ke wallet pengirim di harga $10 (harga ETH dari Chainlink). Dari wallet pribadi (MetaMask/Trust), bukan dari bursa.
    receive() external payable nonReentrant whenNotPaused {
        _buyETH(0);
    }

    function _buyETH(uint256 minAmount) private {
        uint256 amount = (msg.value * ethPrice()) / (PRICE_USD * 1e18);
        if (amount < 1e15) revert TooSmall();
        if (amount < minAmount) revert Slippage();
        _reserve(amount);
        (bool ok,) = treasury.call{value: msg.value}("");
        require(ok, "eth");
        token.safeTransfer(msg.sender, amount);
        emit Bought(msg.sender, amount, address(0), msg.value);
    }

    /// @notice Klaim koin yang dibayar lewat PayPal (voucher dari vault axto.io).
    function claimPaid(address to, uint256 amount, bytes32 ref, uint256 deadline, bytes calldata sig)
        external
        nonReentrant
        whenNotPaused
    {
        if (block.timestamp > deadline) revert Expired();
        if (refUsed[ref]) revert RefUsed();
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(VOUCHER_TYPEHASH, to, amount, ref, deadline)));
        if (signer == address(0) || ECDSA.recover(digest, sig) != signer) revert BadSignature();
        uint256 day = block.timestamp / 1 days;
        if (voucherDay[day] + amount > dailyCap) revert DailyCap();
        voucherDay[day] += amount;
        refUsed[ref] = true;
        _reserve(amount);
        token.safeTransfer(to, amount);
        emit VoucherClaimed(to, amount, ref);
    }

    /// @notice Batalkan voucher (mis. dispute/chargeback PayPal sebelum diklaim).
    function cancelVoucher(bytes32 ref) external {
        require(msg.sender == signer || msg.sender == owner(), "auth");
        refUsed[ref] = true;
        emit VoucherCancelled(ref);
    }

    function _reserve(uint256 amount) private {
        if (sold + amount > CAP) revert SoldOut();
        sold += amount;
    }

    // ---------------------------------------------------------------- admin
    function setSigner(address s) external onlyOwner {
        signer = s;
    }

    function setTreasury(address t) external onlyOwner {
        require(t != address(0), "treasury");
        treasury = t;
    }

    function setDailyCap(uint256 c) external onlyOwner {
        dailyCap = c;
    }

    function setMaxFeedAge(uint256 s) external onlyOwner {
        require(s >= 60 && s <= 1 days, "age");
        maxFeedAge = s;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Sisa koin presale yang tidak terjual hanya bisa ditarik ke owner setelah presale dihentikan permanen.
    function withdrawUnsold() external onlyOwner whenPaused {
        token.safeTransfer(owner(), token.balanceOf(address(this)));
    }
}
