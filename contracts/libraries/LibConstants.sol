// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

error NotTokenAdmin();

library LibConstants {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("erc20.constants");

    event AdminshipTransferred(address indexed previousAdmin, address indexed newAdmin);

    struct ConstantsStates {
        string name;
        string symbol;
        uint8 decimals;
        address admin;
    }

    function diamondStorage() internal pure returns (ConstantsStates storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    function enforceIsTokenAdmin() internal view {
        if(msg.sender != diamondStorage().admin) {
            revert NotTokenAdmin();
        }        
    }

    function setTokenAdmin(address _newAdmin) internal {
        ConstantsStates storage ds = diamondStorage();
        address previousAdmin = ds.admin;
        ds.admin = _newAdmin;
        emit AdminshipTransferred(previousAdmin, _newAdmin);
    }
}