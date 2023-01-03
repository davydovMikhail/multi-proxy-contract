// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { LibBalances } from "../libraries/LibBalances.sol";
import { LibAllowances } from "../libraries/LibAllowances.sol";

contract AllowancesFacet {

    function allowance(address _owner, address _spender) public view returns (uint256) {
        LibAllowances.AllowancesStates storage ds = LibAllowances.diamondStorage();
        return ds.allowances[_owner][_spender];
    }

    function approve(address _spender, uint256 _amount) external returns (bool) {
        address owner = msg.sender;
        LibAllowances.approve(owner, _spender, _amount);
        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) external returns (bool) {
        address spender = msg.sender;
        LibAllowances.spendAllowance(_from, spender, _amount);
        LibBalances.transfer(_from, _to, _amount);
        return true;
    }

    function increaseAllowance(address _spender, uint256 _addedValue) external returns (bool) {
        address owner = msg.sender;
        LibAllowances.approve(owner, _spender, allowance(owner, _spender) + _addedValue);
        return true;
    }

    function decreaseAllowance(address _spender, uint256 _subtractedValue) external virtual returns (bool) {
        address owner = msg.sender;
        uint256 currentAllowance = allowance(owner, _spender);
        require(currentAllowance >= _subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
            LibAllowances.approve(owner, _spender, currentAllowance - _subtractedValue);
        }
        return true;
    }
}