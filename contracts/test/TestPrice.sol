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
    using OracleLibrary for PriceLibrary.OracleStore;

    mapping(IUniswapV2Pair => PriceLibrary.OracleStore) public poolsStore;

    function initPoolStore(IUniswapV2Pair pool, uint quoteTokenIndex) private {
        (uint price0Cumulative, uint price1Cumulative, uint32 blockTimestamp) =
        UniswapV2OracleLibrary.currentCumulativePrices(address(pool));

        poolsStore[pool].blockTimestamp = blockTimestamp;

        uint basePriceCumulative = quoteTokenIndex == 0 ? price1Cumulative : price0Cumulative;

        poolsStore[pool].basePriceCumulative = uint224(basePriceCumulative);
    }

    function testFetchPrice(IUniswapV2Pair pool, address quoteToken) public returns (
        PriceLibrary.OraclePrice memory twap,
        PriceLibrary.OraclePrice memory naive

    ){
        address token0 = IUniswapV2Pair(pool).token0();
        uint quoteTokenIndex = 1;
        if(token0 == quoteToken) {
            quoteTokenIndex = 0;
        }

        if(poolsStore[pool].blockTimestamp == 0) {
            initPoolStore(pool, quoteTokenIndex);
        }

        (twap, naive) = OracleLibrary.fetchPrice(poolsStore[pool], pool, quoteTokenIndex);
    }
}
