// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { LibBalances } from "../libraries/LibBalances.sol";

contract BalancesFacet {

    function totalSupply() external view returns (uint256) {
        LibBalances.BalancesStates storage ds = LibBalances.diamondStorage();
        return ds.totalSupply;
    }

    function balanceOf(address _account) external view returns (uint256) {
        LibBalances.BalancesStates storage ds = LibBalances.diamondStorage();
        return ds.balances[_account];
    }

    function transfer(address _to, uint256 _amount) external returns (bool) {
        address owner = msg.sender;
        LibBalances.transfer(owner, _to, _amount);
        return true;
    }
}
