// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { LibConstants } from "../libraries/LibConstants.sol";

contract ConstantsFacet {

    function name() external view returns (string memory) {
        LibConstants.ConstantsStates storage ds = LibConstants.diamondStorage();
        return ds.name;
    }

    function symbol() external view returns (string memory) {
        LibConstants.ConstantsStates storage ds = LibConstants.diamondStorage();
        return ds.symbol;
    }

    function decimals() external view returns (uint8) {
        LibConstants.ConstantsStates storage ds = LibConstants.diamondStorage();
        return ds.decimals;
    }

    function admin() external view returns (address) {
        LibConstants.ConstantsStates storage ds = LibConstants.diamondStorage();
        return ds.admin;
    }

    function transferAdminship(address _newAdmin) external {
        LibConstants.enforceIsTokenAdmin();
        LibConstants.setTokenAdmin(_newAdmin);
    } 
}
