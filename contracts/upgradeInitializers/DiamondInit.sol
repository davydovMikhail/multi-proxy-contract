// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { LibConstants } from "../libraries/LibConstants.sol";
import { LibBalances } from "../libraries/LibBalances.sol";

contract DiamondInit {    

    function initERC20(string calldata _name, string calldata _symbol, uint8 _decimals, address _admin, uint256 _totalSupply) external {
        LibConstants.ConstantsStates storage constantsStorage = LibConstants.diamondStorage();
        constantsStorage.name = _name;
        constantsStorage.symbol = _symbol;
        constantsStorage.decimals = _decimals;
        constantsStorage.admin = _admin;
        LibBalances.mint(_admin, _totalSupply);
    }
}
