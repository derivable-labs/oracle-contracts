// SPDX-License-Identifier: None
pragma solidity ^0.8.0;

import "../OracleLibrary.sol";
import "../PriceLibrary.sol";
import "../lib/@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "hardhat/console.sol";

/**
    @title Fetch Price
    @dev This contract supports fetching price of one Token using Uniswap Pool (UniswapV2Pair)
*/
contract TestPrice {
    using OracleLibrary for PriceLibrary.OracleStore;

    mapping(IUniswapV2Pair => PriceLibrary.OracleStore) private poolsStore;

    function updateStore(IUniswapV2Pair pool, uint quoteTokenIndex) public {
        (uint price0Cumulative, uint price1Cumulative, uint32 blockTimestamp) =
        UniswapV2OracleLibrary.currentCumulativePrices(address(pool));

        PriceLibrary.OracleStore memory _poolStore;
        _poolStore.blockTimestamp = uint32(block.timestamp);

        uint basePriceCumulative = quoteTokenIndex == 0 ? price1Cumulative : price0Cumulative;

        _poolStore.basePriceCumulative = uint224(basePriceCumulative);

        console.log("basePriceCumulative", price0Cumulative, price1Cumulative, blockTimestamp);

        poolsStore[pool] = _poolStore;
    }

    function getPoolStoreByAddress(IUniswapV2Pair pool) public returns (PriceLibrary.OracleStore memory store) {
        return poolsStore[pool];
    }

    function testFetchPrice(IUniswapV2Pair pool, uint quoteTokenIndex) public returns (
        PriceLibrary.OraclePrice memory twap,
        PriceLibrary.OraclePrice memory naive
    ){
        (twap, naive) = OracleLibrary.fetchPrice(poolsStore[pool], pool, quoteTokenIndex);
    }
}
