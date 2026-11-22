// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IAxtoSaleSold {
    function sold() external view returns (uint256);
}

/**
 * @title AXTO
 * @notice Koin AXTO: 10.000.000 dicetak sekali saat deploy langsung ke alamat-alamat pemilik (perintah #41):
 *  presale 2 jt · vesting/listing DEX 3 jt · hold 5 tahun 3 jt · bank (jatah owner) 2 jt. Presale menjual dari wallet
 *  presale lewat allowance; bank juga menerima komisi 10% marketplace yang dibayar AXTO (AxtoAuctionHouse.feeWallet).
 *  Tidak ada mint tambahan, burn, pajak transfer, maupun blacklist.
 *  Sebelum `enableTrading` transfer antar-pengguna dikunci; yang boleh hanya transfer yang melibatkan alamat
 *  tepercaya (Sale, AuctionHouse, Vesting, Lock, treasury, owner). `enableTrading` satu arah — tidak bisa dimatikan
 *  lagi — dan hanya bisa setelah presale 2.000.000 AXTO habis atau 365 hari sejak deploy.
 */
/// @dev Ownable satu langkah: deployer sistem membagi koin lalu langsung menyerahkan owner ke wallet koin (perintah #31).
contract AxtoToken is ERC20, ERC20Permit, Ownable {
    uint256 public constant TOTAL_SUPPLY = 10_000_000 ether;
    uint256 public constant PRESALE_TARGET = 2_000_000 ether;
    uint256 public immutable deployedAt;

    bool public tradingEnabled;
    uint256 public tradingEnabledAt;
    address public sale;
    mapping(address => bool) public trusted;

    event TradingEnabled(uint256 at);
    event TrustedUpdated(address account, bool trusted);
    event SaleSet(address sale);

    error TradingNotEnabled();
    error TradingConditionsNotMet();

    /// @notice Pembagian langsung saat deploy ke alamat-alamat milik pemilik (perintah #41): presale, vesting/listing DEX,
    ///  hold 5 tahun, bank (jatah owner). Jumlah harus tepat 10.000.000; semua penerima tepercaya (boleh saling kirim
    ///  sebelum listing DEX).
    constructor(address owner_, address[] memory to, uint256[] memory amounts) ERC20("AXTO", "AXTO") ERC20Permit("AXTO") Ownable(owner_) {
        require(to.length == amounts.length && to.length > 0, "alloc");
        deployedAt = block.timestamp;
        trusted[owner_] = true;
        uint256 sum;
        for (uint256 i; i < to.length; ++i) {
            require(to[i] != address(0), "to");
            trusted[to[i]] = true;
            _mint(to[i], amounts[i]);
            sum += amounts[i];
        }
        require(sum == TOTAL_SUPPLY, "total");
    }

    /// @notice Daftarkan kontrak resmi. Hanya berpengaruh sebelum trading dibuka.
    function setTrusted(address account, bool t) external onlyOwner {
        trusted[account] = t;
        emit TrustedUpdated(account, t);
    }

    /// @notice Daftarkan kontrak presale (sekali). Presale menjual LANGSUNG dari wallet presale pemilik (`source`) lewat
    ///  izin (allowance) 2.000.000 AXTO — koin tetap di wallet itu sampai terjual. Pemilik bisa mengubah/menarik izin
    ///  kapan saja dengan `approve(sale, x)` dari wallet presale-nya.
    function setSale(address s, address source) external onlyOwner {
        require(sale == address(0), "sale set");
        require(source != address(0), "source");
        sale = s;
        trusted[s] = true;
        // izin jual 2 jt dari wallet presale pemilik (perintah #40); pemilik mengisi wallet itu sendiri dari wallet bank
        _approve(source, s, PRESALE_TARGET);
        emit SaleSet(s);
    }

    function enableTrading() external onlyOwner {
        require(!tradingEnabled, "enabled");
        bool soldOut = sale != address(0) && IAxtoSaleSold(sale).sold() >= PRESALE_TARGET;
        if (!soldOut && block.timestamp < deployedAt + 365 days) revert TradingConditionsNotMet();
        tradingEnabled = true;
        tradingEnabledAt = block.timestamp;
        emit TradingEnabled(block.timestamp);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (!tradingEnabled && from != address(0) && !trusted[from] && !trusted[to] && !trusted[msg.sender]) {
            revert TradingNotEnabled();
        }
        super._update(from, to, value);
    }
}
