// SPDX-License-Identifier: None
pragma solidity ^0.8.0;

import "../OracleLibrary.sol";
import "../PriceLibrary.sol";
import "../@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "hardhat/console.sol";

/**
    @title Fetch Price
    @dev This contract supports fetching price of one Token using Uniswap Pool (UniswapV2Pair)
*/
contract TestPrice {
    using OracleLibrary for OracleStore;

    mapping(IUniswapV2Pair => OracleStore) public poolsStore;

    function initPoolStore(IUniswapV2Pair pool, uint baseTokenIndex) private {
        poolsStore[pool].init(pool, baseTokenIndex);
    }

    function testFetchPrice(IUniswapV2Pair pool, address baseToken) public returns (
        OraclePrice memory twap,
        OraclePrice memory naive
    ){
        address token0 = IUniswapV2Pair(pool).token0();
        uint baseTokenIndex = 1;
        if (token0 == baseToken) {
            baseTokenIndex = 0;
        }

        if(poolsStore[pool].blockTimestamp == 0) {
            initPoolStore(pool, baseTokenIndex);
        }

        (twap, naive) = OracleLibrary.fetchPrice(poolsStore[pool], pool, baseTokenIndex);
    }
}
