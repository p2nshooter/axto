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
 * @notice Koin AXTO: 10.000.000 dicetak sekali saat deploy SELURUHNYA ke wallet koin pemilik (`holder`); pemilik
 *  membagi sendiri ke alamat-alamat miliknya (perintah pemilik #39). Presale menjual dari wallet itu lewat allowance.
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

    /// @notice Pemegang seluruh suplai (wallet koin pemilik). Pemilik membagi sendiri ke alamat-alamatnya (perintah #39).
    address public immutable holder;

    constructor(address owner_, address holder_) ERC20("AXTO", "AXTO") ERC20Permit("AXTO") Ownable(owner_) {
        require(holder_ != address(0), "holder");
        deployedAt = block.timestamp;
        holder = holder_;
        trusted[owner_] = true;
        trusted[holder_] = true;
        _mint(holder_, TOTAL_SUPPLY); // 10.000.000 AXTO seluruhnya ke wallet koin pemilik
    }

    /// @notice Daftarkan kontrak resmi. Hanya berpengaruh sebelum trading dibuka.
    function setTrusted(address account, bool t) external onlyOwner {
        trusted[account] = t;
        emit TrustedUpdated(account, t);
    }

    /// @notice Daftarkan kontrak presale (sekali). Presale menjual LANGSUNG dari wallet pemegang lewat izin (allowance)
    ///  2.000.000 AXTO — koin tetap di wallet pemilik sampai terjual. Pemilik bisa mengubah/menarik izin itu kapan saja
    ///  dengan `approve(sale, x)` dari wallet koinnya.
    function setSale(address s) external onlyOwner {
        require(sale == address(0), "sale set");
        sale = s;
        trusted[s] = true;
        _approve(holder, s, PRESALE_TARGET);
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
