// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC1155MetadataURI} from "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";
import {ERC1155Utils} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Utils.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title AxtoEditions
 * @notice Koleksi AXTO berbentuk edisi (ERC-1155) — keputusan akhir pemilik 23 Nov 2026:
 *  - Koleksi OpenSea (TIME, STAMP, QURAN, MODEL, HADITH): setiap NFT punya supply 1–10 menurut kelangkaannya dan dijual
 *    harga tetap di OpenSea oleh wallet toko sistem (`custody`). Token id = urutan rilis 1, 2, 3, … dalam urutan acak
 *    etalase; karya untuk tiap id ditentukan engine dan dijelaskan oleh metadata (`uri`).
 *    Rilis (`release`) TIDAK menulis saldo per token: jumlah edisi disimpan 4 bit per id (64 id per slot) dan saldo
 *    kustodi dihitung darinya sampai token itu pertama kali berpindah. Event `TransferBatch` dari alamat nol
 *    mengumumkan setiap edisi ke OpenSea seperti mint biasa. Konduit OpenSea disetujui untuk kustodi sejak konstruktor.
 *  - Koleksi eksklusif axto.io: supply 10 per NFT (`editionCap`), dijual axto.io $1 dan diperdagangkan member di
 *    axto.io (kustodi). Token baru tercetak di wallet member saat member menarik (WD) — satuan atau massal dalam satu
 *    transaksi untuk menghemat gas — dengan voucher bertanda tangan vault (`mintWithVoucher`). Gas dibayar member.
 *  Royalti jual kembali 10% (ERC-2981) ke treasury.
 */
contract AxtoEditions is IERC1155, IERC1155MetadataURI, ERC2981, Ownable2Step, EIP712 {
    using Strings for uint256;

    bytes32 public constant VOUCHER_TYPEHASH =
        keccak256("MintVoucher(address to,uint256[] ids,uint256[] amounts,bytes32 ref,uint256 deadline)");
    uint256 public constant MAX_EDITION = 10;

    struct Config {
        string name;
        string symbol;
        address owner; // wallet admin pemilik
        address royaltyReceiver; // treasury (royalti 10%)
        string baseURI; // metadata: baseURI + id
        string contractURI;
        address custody; // koleksi OpenSea: wallet toko pemegang edisi yang dirilis; 0 untuk eksklusif
        address operator; // konduit OpenSea, disetujui untuk kustodi; boleh 0
        address releaser; // wallet sistem yang boleh merilis edisi (selain owner); boleh 0
        address signer; // penanda tangan voucher WD (eksklusif); boleh 0
        uint256 maxId; // id tertinggi yang boleh ada
        uint256 editionCap; // eksklusif: salinan per id (10); 0 untuk koleksi OpenSea
    }

    string public name;
    string public symbol;
    address public immutable custody;
    uint256 public immutable maxId;
    uint256 public immutable editionCap;
    address public releaser;
    address public signer;
    /// @notice Koleksi OpenSea: id 1..released sudah dirilis ke kustodi.
    uint256 public released;
    /// @notice Eksklusif: salinan yang sudah tercetak per id (maks `editionCap`).
    mapping(uint256 => uint256) public minted;
    mapping(bytes32 => bool) public voucherUsed;

    mapping(uint256 => mapping(address => uint256)) private _bal;
    mapping(address => mapping(address => bool)) private _ops;
    mapping(uint256 => uint256) private _supplyWords; // 4 bit per id
    mapping(uint256 => uint256) private _touchedWords; // 1 bit per id: saldo kustodi sudah ditulis nyata
    string private _base;
    string private _contractURI;

    event Released(uint256 fromId, uint256 toId, uint256 editions);
    event SignerUpdated(address signer);
    event ReleaserUpdated(address releaser);

    error NotAuthorized();
    error BadId();
    error BadAmount();
    error Insufficient();
    error VoucherExpired();
    error VoucherUsed();
    error BadSignature();
    error NotExclusive();
    error NotOpenSeaCollection();

    constructor(Config memory c) Ownable(c.owner) EIP712(c.name, "1") {
        require(c.royaltyReceiver != address(0) && c.maxId > 0, "config");
        require(c.editionCap <= MAX_EDITION, "cap");
        require((c.editionCap == 0) == (c.custody != address(0)), "mode"); // OpenSea: kustodi; eksklusif: cap
        name = c.name;
        symbol = c.symbol;
        custody = c.custody;
        maxId = c.maxId;
        editionCap = c.editionCap;
        releaser = c.releaser;
        signer = c.signer;
        _base = c.baseURI;
        _contractURI = c.contractURI;
        _setDefaultRoyalty(c.royaltyReceiver, 1000); // 10%
        if (c.operator != address(0) && c.custody != address(0) && c.operator != c.custody) {
            _ops[c.custody][c.operator] = true;
            emit ApprovalForAll(c.custody, c.operator, true);
        }
        if (c.signer != address(0)) emit SignerUpdated(c.signer);
        if (c.releaser != address(0)) emit ReleaserUpdated(c.releaser);
    }

    // ---------------------------------------------------------------- jumlah edisi

    /// @notice Jumlah edisi sebuah NFT: eksklusif = editionCap; OpenSea = nilai saat dirilis (0 = belum dirilis).
    function supplyOf(uint256 id) public view returns (uint256) {
        if (editionCap > 0) return id >= 1 && id <= maxId ? editionCap : 0;
        return (_supplyWords[id >> 6] >> ((id & 63) * 4)) & 0xF;
    }

    /// @notice Edisi yang beredar: eksklusif = sudah tercetak; OpenSea = semua edisi yang dirilis.
    function totalSupply(uint256 id) external view returns (uint256) {
        return editionCap > 0 ? minted[id] : supplyOf(id);
    }

    function exists(uint256 id) external view returns (bool) {
        return editionCap > 0 ? minted[id] > 0 : supplyOf(id) > 0;
    }

    function _touched(uint256 id) private view returns (bool) {
        return (_touchedWords[id >> 8] >> (id & 255)) & 1 == 1;
    }

    // ---------------------------------------------------------------- ERC-1155

    function balanceOf(address account, uint256 id) public view returns (uint256) {
        if (account == custody && account != address(0) && !_touched(id)) return supplyOf(id);
        return _bal[id][account];
    }

    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory out) {
        require(accounts.length == ids.length, "length");
        out = new uint256[](ids.length);
        for (uint256 i; i < ids.length; ++i) out[i] = balanceOf(accounts[i], ids[i]);
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(operator != address(0) && operator != msg.sender, "operator");
        _ops[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _ops[account][operator];
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external {
        if (from != msg.sender && !_ops[from][msg.sender]) revert NotAuthorized();
        _move(from, to, id, value);
        emit TransferSingle(msg.sender, from, to, id, value);
        ERC1155Utils.checkOnERC1155Received(msg.sender, from, to, id, value, data);
    }

    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) external {
        if (from != msg.sender && !_ops[from][msg.sender]) revert NotAuthorized();
        require(ids.length == values.length, "length");
        for (uint256 i; i < ids.length; ++i) _move(from, to, ids[i], values[i]);
        emit TransferBatch(msg.sender, from, to, ids, values);
        ERC1155Utils.checkOnERC1155BatchReceived(msg.sender, from, to, ids, values, data);
    }

    function _move(address from, address to, uint256 id, uint256 value) private {
        require(to != address(0), "to");
        if (from == custody && !_touched(id)) {
            // saldo kustodi virtual → ditulis nyata pada perpindahan pertama
            _bal[id][from] = supplyOf(id);
            _touchedWords[id >> 8] |= 1 << (id & 255);
        }
        uint256 b = _bal[id][from];
        if (b < value) revert Insufficient();
        unchecked {
            _bal[id][from] = b - value;
        }
        _bal[id][to] += value;
    }

    // ---------------------------------------------------------------- rilis (koleksi OpenSea)

    /// @notice Merilis id `released+1 .. released+n` ke kustodi; `supplies[i]` = jumlah edisi (1..10) id ke-i.
    function release(bytes calldata supplies) external {
        if (msg.sender != owner() && msg.sender != releaser) revert NotAuthorized();
        if (editionCap != 0) revert NotOpenSeaCollection();
        uint256 n = supplies.length;
        uint256 from = released + 1;
        if (n == 0 || released + n > maxId) revert BadId();
        uint256[] memory ids = new uint256[](n);
        uint256[] memory amounts = new uint256[](n);
        uint256 total;
        for (uint256 i; i < n; ++i) {
            uint256 id = from + i;
            uint256 s = uint8(supplies[i]);
            if (s == 0 || s > MAX_EDITION) revert BadAmount();
            _supplyWords[id >> 6] |= s << ((id & 63) * 4);
            ids[i] = id;
            amounts[i] = s;
            total += s;
        }
        released += n;
        emit TransferBatch(msg.sender, address(0), custody, ids, amounts);
        emit Released(from, from + n - 1, total);
    }

    // ---------------------------------------------------------------- WD eksklusif (gas oleh member)

    /// @notice Cetak edisi eksklusif ke wallet member (satuan atau massal) dengan voucher vault axto.io.
    function mintWithVoucher(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes32 ref,
        uint256 deadline,
        bytes calldata sig
    ) external {
        if (editionCap == 0) revert NotExclusive();
        if (block.timestamp > deadline) revert VoucherExpired();
        if (voucherUsed[ref]) revert VoucherUsed();
        require(ids.length == amounts.length && ids.length > 0 && to != address(0), "args");
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(VOUCHER_TYPEHASH, to, keccak256(abi.encodePacked(ids)), keccak256(abi.encodePacked(amounts)), ref, deadline))
        );
        if (signer == address(0) || ECDSA.recover(digest, sig) != signer) revert BadSignature();
        voucherUsed[ref] = true;
        for (uint256 i; i < ids.length; ++i) {
            uint256 id = ids[i];
            uint256 a = amounts[i];
            if (id == 0 || id > maxId) revert BadId();
            if (a == 0 || minted[id] + a > editionCap) revert BadAmount();
            minted[id] += a;
            _bal[id][to] += a;
        }
        emit TransferBatch(msg.sender, address(0), to, ids, amounts);
        ERC1155Utils.checkOnERC1155BatchReceived(msg.sender, address(0), to, ids, amounts, "");
    }

    // ---------------------------------------------------------------- metadata & admin

    function uri(uint256 id) external view returns (string memory) {
        return string.concat(_base, id.toString());
    }

    function contractURI() external view returns (string memory) {
        return _contractURI;
    }

    function setBaseURI(string calldata u) external onlyOwner {
        _base = u;
    }

    function setContractURI(string calldata u) external onlyOwner {
        _contractURI = u;
    }

    function setSigner(address s) external onlyOwner {
        signer = s;
        emit SignerUpdated(s);
    }

    function setReleaser(address r) external onlyOwner {
        releaser = r;
        emit ReleaserUpdated(r);
    }

    function setRoyalty(address receiver, uint96 bps) external onlyOwner {
        require(bps <= 1000, "max 10%");
        _setDefaultRoyalty(receiver, bps);
    }

    function supportsInterface(bytes4 id) public view override(ERC2981, IERC165) returns (bool) {
        return id == type(IERC1155).interfaceId || id == type(IERC1155MetadataURI).interfaceId || super.supportsInterface(id);
    }
}
