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

/// @notice Tiruan CreatorTokenTransferValidator v3 untuk uji: daftar putih operator + OTC (pemilik memindah sendiri).
contract MockTransferValidator {
    uint120 public lastListId;
    mapping(uint120 => address) public listOwners;
    mapping(uint120 => mapping(address => bool)) public whitelisted;
    mapping(address => uint120) public listOf;
    mapping(address => uint16) public tokenTypeOf;
    error CallerMustBeWhitelisted();

    function createList(string calldata) external returns (uint120 id) {
        id = ++lastListId;
        listOwners[id] = msg.sender;
    }

    function addAccountsToWhitelist(uint120 id, address[] calldata accounts) external {
        require(listOwners[id] == msg.sender, "owner");
        for (uint256 i; i < accounts.length; ++i) whitelisted[id][accounts[i]] = true;
    }

    function removeAccountsFromWhitelist(uint120 id, address[] calldata accounts) external {
        require(listOwners[id] == msg.sender, "owner");
        for (uint256 i; i < accounts.length; ++i) whitelisted[id][accounts[i]] = false;
    }

    function applyListToCollection(address collection, uint120 id) external {
        require(msg.sender == collection, "caller");
        listOf[collection] = id;
    }

    function setTokenTypeOfCollection(address collection, uint16 t) external {
        require(msg.sender == collection, "caller");
        tokenTypeOf[collection] = t;
    }

    function isAccountWhitelistedByCollection(address collection, address account) external view returns (bool) {
        return whitelisted[listOf[collection]][account];
    }

    function validateTransfer(address caller, address from, address, uint256, uint256) external view {
        if (caller == from) return; // OTC
        if (!whitelisted[listOf[msg.sender]][caller]) revert CallerMustBeWhitelisted();
    }
}
