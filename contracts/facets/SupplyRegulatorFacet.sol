// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { LibBalances } from "../libraries/LibBalances.sol";
import { LibConstants } from "../libraries/LibConstants.sol";

contract SupplyRegulatorFacet {
    
    function mint(address _account, uint256 _amount) external {
        LibConstants.enforceIsTokenAdmin();
        LibBalances.mint(_account, _amount);
    }

    function burn(address _account, uint256 _amount) external {
        LibConstants.enforceIsTokenAdmin();
        LibBalances.burn(_account, _amount);
    }
}