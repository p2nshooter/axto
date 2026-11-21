// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Hanya untuk tes.
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 a) external {
        _mint(to, a);
    }
}

/// @dev Hanya untuk tes.
contract MockFeed {
    int256 public price;
    uint256 public updatedAt;

    constructor(int256 p) {
        price = p;
        updatedAt = block.timestamp;
    }

    function set(int256 p, uint256 at) external {
        price = p;
        updatedAt = at;
    }

    function decimals() external pure returns (uint8) {
        return 8;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, price, updatedAt, updatedAt, 1);
    }
}
