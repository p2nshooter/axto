// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IAxtoTradingClock {
    function tradingEnabledAt() external view returns (uint256);
}

/**
 * @title AxtoVesting
 * @notice Alokasi tim (30% = 3.000.000 AXTO). Rilis 10% per tahun penuh setelah listing DEX (`enableTrading`):
 *  tahun ke-1 → 10%, ..., tahun ke-10 → 100%. Tidak ada owner, tidak bisa dipercepat.
 */
contract AxtoVesting {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public immutable beneficiary;
    uint256 public immutable total;
    uint256 public released;

    event Released(uint256 amount);

    constructor(IERC20 token_, address beneficiary_, uint256 total_) {
        require(beneficiary_ != address(0) && total_ > 0, "config");
        token = token_;
        beneficiary = beneficiary_;
        total = total_;
    }

    function vested() public view returns (uint256) {
        uint256 start = IAxtoTradingClock(address(token)).tradingEnabledAt();
        if (start == 0 || block.timestamp < start) return 0;
        uint256 years_ = (block.timestamp - start) / 365 days;
        if (years_ >= 10) return total;
        return (total * years_) / 10;
    }

    function releasable() public view returns (uint256) {
        return vested() - released;
    }

    function release() external {
        uint256 amt = releasable();
        require(amt > 0, "nothing");
        released += amt;
        token.safeTransfer(beneficiary, amt);
        emit Released(amt);
    }
}
