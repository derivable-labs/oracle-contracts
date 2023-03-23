// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./OracleLibrary.sol";

contract PriceUniv2 {
    using OracleLibrary for OracleStore;

    uint public constant PERIOD = 1 minutes;

    mapping(address => mapping(uint => OracleStore)) s_stores;
    // s_stores[pool][quoteTokenIndex]

    function fetch(address pool, uint quoteTokenIndex) public returns (uint224 twap, uint224 spot) {
        if(s_stores[pool][quoteTokenIndex].blockTimestamp == 0) {
            s_stores[pool][quoteTokenIndex].init(pool, quoteTokenIndex);
        }

        (twap, spot) = s_stores[pool][quoteTokenIndex].fetchPrice(pool, quoteTokenIndex, PERIOD);
    }

    function peek(address pool, uint quoteTokenIndex) public view returns (uint224 twap, uint224 spot) {
        (twap, spot, ) = s_stores[pool][quoteTokenIndex].peekPrice(pool, quoteTokenIndex);
    }
}