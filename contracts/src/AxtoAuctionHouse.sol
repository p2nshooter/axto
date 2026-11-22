// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IAxtoMint {
    function mint(address to, uint256 tokenId) external;
}

interface IAxtoCustody {
    function custody() external view returns (address);
}

/**
 * @title AxtoAuctionHouse
 * @notice Penyelesaian lelang axto.io. Dana penawar TIDAK pernah dititipkan: penawar memberi allowance (USDC/AXTO)
 *  dan menandatangani tawaran EIP-712 tanpa gas. Setelah lelang ditutup, pemenang sendiri memanggil `claim`
 *  (gas dibayar pemenang) dengan tawarannya + attestasi hasil dari signer axto.io.
 *  Kontrak memastikan: tanda tangan penawar sah, harga ≤ batas yang ditandatangani penawar, lot belum pernah
 *  diselesaikan, attestasi belum kedaluwarsa. Mode pengiriman:
 *   0 = mint langsung ke pemenang (cadangan)
 *   1 = transfer dari kustodi koleksi (wallet admin; kontrak ini operatornya) — koleksi publik, premint saat deploy (#30)
 *   2 = kustodi axto.io (edisi eksklusif; hanya pembayaran + event, NFT dicatat off-chain sampai WD)
 *  Pembagian: seller == 0 → 100% treasury; seller != 0 (resale marketplace eksklusif) → 90% seller, 10% treasury.
 */
contract AxtoAuctionHouse is Ownable2Step, Pausable, ReentrancyGuard, EIP712, IERC721Receiver {
    using SafeERC20 for IERC20;

    struct Bid {
        bytes32 lotId;
        address collection;
        uint256 tokenId;
        address currency;
        uint256 maxAmount;
        uint256 nonce;
        uint256 deadline;
    }

    struct Result {
        bytes32 lotId;
        address collection;
        uint256 tokenId;
        address winner;
        address currency;
        uint256 price;
        address seller;
        uint8 mode;
        uint256 deadline;
    }

    bytes32 public constant BID_TYPEHASH = keccak256(
        "Bid(bytes32 lotId,address collection,uint256 tokenId,address currency,uint256 maxAmount,uint256 nonce,uint256 deadline)"
    );
    bytes32 public constant RESULT_TYPEHASH = keccak256(
        "Result(bytes32 lotId,address collection,uint256 tokenId,address winner,address currency,uint256 price,address seller,uint8 mode,uint256 deadline)"
    );

    address public signer;
    address public treasury;
    mapping(address => bool) public currencies;
    mapping(bytes32 => bool) public settled;
    mapping(address => mapping(uint256 => bool)) public nonceUsed;

    event Claimed(
        bytes32 indexed lotId,
        address indexed collection,
        uint256 indexed tokenId,
        address winner,
        address currency,
        uint256 price,
        address seller,
        uint8 mode
    );
    event SignerUpdated(address signer);
    event TreasuryUpdated(address treasury);
    event CurrencyUpdated(address currency, bool allowed);
    event NonceCancelled(address bidder, uint256 nonce);

    error Expired();
    error AlreadySettled();
    error NotWinner();
    error Mismatch();
    error BadPrice();
    error BadSignature();
    error NonceUsed();
    error CurrencyNotAllowed();
    error BadMode();

    /// @notice Mata uang (USDC, AXTO) langsung di konstruktor → owner tidak perlu transaksi tambahan.
    constructor(address owner_, address treasury_, address signer_, address[] memory currencies_)
        Ownable(owner_)
        EIP712("AXTO Auction House", "1")
    {
        require(treasury_ != address(0), "treasury");
        treasury = treasury_;
        signer = signer_;
        for (uint256 i; i < currencies_.length; ++i) {
            currencies[currencies_[i]] = true;
            emit CurrencyUpdated(currencies_[i], true);
        }
    }

    function hashBid(Bid calldata b) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(BID_TYPEHASH, b.lotId, b.collection, b.tokenId, b.currency, b.maxAmount, b.nonce, b.deadline))
        );
    }

    function hashResult(Result calldata r) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    RESULT_TYPEHASH, r.lotId, r.collection, r.tokenId, r.winner, r.currency, r.price, r.seller, r.mode, r.deadline
                )
            )
        );
    }

    /// @notice Pemenang mengklaim lot. Gas dibayar pemenang.
    function claim(Bid calldata bid, bytes calldata bidSig, Result calldata res, bytes calldata resSig)
        external
        nonReentrant
        whenNotPaused
    {
        if (block.timestamp > res.deadline || block.timestamp > bid.deadline) revert Expired();
        if (settled[res.lotId]) revert AlreadySettled();
        if (msg.sender != res.winner) revert NotWinner();
        if (
            bid.lotId != res.lotId || bid.collection != res.collection || bid.tokenId != res.tokenId
                || bid.currency != res.currency
        ) revert Mismatch();
        if (res.price == 0 || res.price > bid.maxAmount) revert BadPrice();
        if (!currencies[res.currency]) revert CurrencyNotAllowed();
        if (res.mode > 2) revert BadMode();
        if (ECDSA.recover(hashBid(bid), bidSig) != res.winner) revert BadSignature();
        if (signer == address(0) || ECDSA.recover(hashResult(res), resSig) != signer) revert BadSignature();
        if (nonceUsed[res.winner][bid.nonce]) revert NonceUsed();

        nonceUsed[res.winner][bid.nonce] = true;
        settled[res.lotId] = true;

        IERC20 cur = IERC20(res.currency);
        if (res.seller == address(0)) {
            cur.safeTransferFrom(res.winner, treasury, res.price);
        } else {
            uint256 fee = (res.price + 9) / 10; // 10% dibulatkan ke atas
            cur.safeTransferFrom(res.winner, treasury, fee);
            cur.safeTransferFrom(res.winner, res.seller, res.price - fee);
        }

        if (res.mode == 0) {
            IAxtoMint(res.collection).mint(res.winner, res.tokenId);
        } else if (res.mode == 1) {
            // koleksi publik: token tercetak sejak deploy di kustodi koleksi (wallet admin); kontrak ini operatornya
            address from = IAxtoCustody(res.collection).custody();
            IERC721(res.collection).safeTransferFrom(from, res.winner, res.tokenId);
        }
        emit Claimed(res.lotId, res.collection, res.tokenId, res.winner, res.currency, res.price, res.seller, res.mode);
    }

    /// @notice Penawar boleh membatalkan tanda tangan tawarannya sendiri kapan saja.
    function cancelNonce(uint256 nonce) external {
        nonceUsed[msg.sender][nonce] = true;
        emit NonceCancelled(msg.sender, nonce);
    }

    // ---------------------------------------------------------------- admin

    function setSigner(address s) external onlyOwner {
        signer = s;
        emit SignerUpdated(s);
    }

    function setTreasury(address t) external onlyOwner {
        require(t != address(0), "treasury");
        treasury = t;
        emit TreasuryUpdated(t);
    }

    function setCurrency(address c, bool allowed) external onlyOwner {
        currencies[c] = allowed;
        emit CurrencyUpdated(c, allowed);
    }

    /// @notice Kembalikan NFT premint yang tidak terjual ke owner (tidak bisa ke alamat lain).
    function returnUnsold(address collection, uint256 tokenId) external onlyOwner {
        IERC721(collection).safeTransferFrom(address(this), owner(), tokenId);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
