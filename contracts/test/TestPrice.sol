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

    function testFetchPrice(IUniswapV2Pair pool, address baseToken) public returns (
        OraclePrice memory twap,
        OraclePrice memory naive
    ){
        address token0 = IUniswapV2Pair(pool).token0();

        if(poolsStore[pool].blockTimestamp == 0) {
            poolsStore[pool].init(pool, token0 == baseToken);
        }

        (twap, naive) = poolsStore[pool].fetchPrice(pool, token0 == baseToken);
    }
}
