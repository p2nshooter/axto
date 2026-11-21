// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @notice Antarmuka Creator Token (ERC-721C, Limit Break) — OpenSea menegakkan royalti untuk kontrak yang mendukungnya.
interface ICreatorToken {
    event TransferValidatorUpdated(address oldValidator, address newValidator);
    function getTransferValidator() external view returns (address validator);
    function getTransferValidationFunction() external view returns (bytes4 functionSignature, bool isViewFunction);
    function setTransferValidator(address validator) external;
}

interface ITransferValidator {
    function validateTransfer(address caller, address from, address to, uint256 tokenId) external view;
}

/**
 * @title AxtoCollection
 * @notice Koleksi 1/1 AXTO (TIME, STAMP, QURAN, MODEL, dan edisi eksklusif). Token hanya bisa lahir lewat:
 *  - `mint` oleh kontrak minter resmi (AxtoAuctionHouse) saat pemenang lelang mengklaim, atau
 *  - `mintWithVoucher` bertanda tangan signer yang ditunjuk owner (penarikan edisi eksklusif).
 *  Royalti jual kembali 10% (ERC-2981) ke treasury; kait ERC-721C untuk penegakan royalti di OpenSea.
 */
contract AxtoCollection is ERC721, ERC2981, Ownable2Step, Pausable, EIP712, ICreatorToken {
    using Strings for uint256;

    bytes32 public constant VOUCHER_TYPEHASH =
        keccak256("MintVoucher(address to,uint256 tokenId,bytes32 ref,uint256 deadline)");

    uint256 public immutable maxSupply;
    uint256 public totalMinted;
    address public signer;
    bool public metadataFrozen;
    mapping(address => bool) public minters;
    mapping(bytes32 => bool) public voucherUsed;

    string private _base;
    string private _contractURI;
    address private _validator;

    event SignerUpdated(address signer);
    event MinterUpdated(address minter, bool allowed);
    event BaseURIUpdated(string baseURI);
    event MetadataFrozen();
    event BatchMetadataUpdate(uint256 fromTokenId, uint256 toTokenId);

    error NotMinter();
    error BadTokenId();
    error VoucherExpired();
    error VoucherUsed();
    error BadSignature();
    error Frozen();

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        address owner_,
        address royaltyReceiver,
        string memory baseURI_,
        string memory contractURI_
    ) ERC721(name_, symbol_) Ownable(owner_) EIP712(name_, "1") {
        require(maxSupply_ > 0 && royaltyReceiver != address(0), "config");
        maxSupply = maxSupply_;
        _base = baseURI_;
        _contractURI = contractURI_;
        _setDefaultRoyalty(royaltyReceiver, 1000); // 10%
    }

    // ---------------------------------------------------------------- mint

    function mint(address to, uint256 tokenId) external whenNotPaused {
        if (!minters[msg.sender]) revert NotMinter();
        _mintChecked(to, tokenId);
    }

    /// @notice Mint banyak token ke satu alamat (mode premint: ke kontrak AuctionHouse agar tampil di OpenSea).
    function mintBatch(address to, uint256[] calldata tokenIds) external whenNotPaused {
        if (!minters[msg.sender]) revert NotMinter();
        for (uint256 i; i < tokenIds.length; ++i) _mintChecked(to, tokenIds[i]);
    }

    /// @notice Penarikan edisi eksklusif: member mengirim sendiri (gas oleh member).
    function mintWithVoucher(address to, uint256 tokenId, bytes32 ref, uint256 deadline, bytes calldata sig)
        external
        whenNotPaused
    {
        if (block.timestamp > deadline) revert VoucherExpired();
        if (voucherUsed[ref]) revert VoucherUsed();
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(VOUCHER_TYPEHASH, to, tokenId, ref, deadline)));
        if (signer == address(0) || ECDSA.recover(digest, sig) != signer) revert BadSignature();
        voucherUsed[ref] = true;
        _mintChecked(to, tokenId);
    }

    function _mintChecked(address to, uint256 tokenId) private {
        if (tokenId == 0 || tokenId > maxSupply) revert BadTokenId();
        unchecked {
            ++totalMinted;
        }
        _safeMint(to, tokenId);
    }

    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // ---------------------------------------------------------------- metadata

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat(_base, tokenId.toString());
    }

    function contractURI() external view returns (string memory) {
        return _contractURI;
    }

    // ---------------------------------------------------------------- admin (owner = MetaMask admin)

    function setSigner(address s) external onlyOwner {
        signer = s;
        emit SignerUpdated(s);
    }

    function setMinter(address m, bool allowed) external onlyOwner {
        minters[m] = allowed;
        emit MinterUpdated(m, allowed);
    }

    function setBaseURI(string calldata u) external onlyOwner {
        if (metadataFrozen) revert Frozen();
        _base = u;
        emit BaseURIUpdated(u);
        emit BatchMetadataUpdate(1, maxSupply);
    }

    function setContractURI(string calldata u) external onlyOwner {
        _contractURI = u;
    }

    function freezeMetadata() external onlyOwner {
        metadataFrozen = true;
        emit MetadataFrozen();
    }

    function setRoyalty(address receiver, uint96 bps) external onlyOwner {
        require(bps <= 1000, "max 10%");
        _setDefaultRoyalty(receiver, bps);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ---------------------------------------------------------------- ERC-721C

    function getTransferValidator() external view returns (address) {
        return _validator;
    }

    function getTransferValidationFunction() external pure returns (bytes4, bool) {
        return (ITransferValidator.validateTransfer.selector, true);
    }

    function setTransferValidator(address v) external onlyOwner {
        emit TransferValidatorUpdated(_validator, v);
        _validator = v;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0) && _validator != address(0)) {
            ITransferValidator(_validator).validateTransfer(msg.sender, from, to, tokenId);
        }
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 id) public view override(ERC721, ERC2981) returns (bool) {
        return id == type(ICreatorToken).interfaceId || ERC721.supportsInterface(id) || ERC2981.supportsInterface(id);
    }
}
