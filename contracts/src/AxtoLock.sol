// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AxtoLock
 * @notice 20% (2.000.000 AXTO) dikunci 5 tahun sejak deploy, lalu seluruhnya ke beneficiary (treasury).
 *  Tanpa owner, tanpa jalan pintas.
 */
contract AxtoLock {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public immutable beneficiary;
    uint256 public immutable releaseTime;

    event Released(uint256 amount);

    constructor(IERC20 token_, address beneficiary_) {
        require(beneficiary_ != address(0), "beneficiary");
        token = token_;
        beneficiary = beneficiary_;
        releaseTime = block.timestamp + 5 * 365 days;
    }

    function release() external {
        require(block.timestamp >= releaseTime, "locked");
        uint256 amt = token.balanceOf(address(this));
        require(amt > 0, "empty");
        token.safeTransfer(beneficiary, amt);
        emit Released(amt);
    }
}
