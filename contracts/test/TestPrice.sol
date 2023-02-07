// SPDX-License-Identifier: None
pragma solidity =0.7.6;

import "../OracleLibrary.sol";
import "../PriceLibrary.sol";
import "../@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "hardhat/console.sol";

pragma abicoder v2;

/**
    @title Fetch Price
    @dev This contract supports fetching price of one Token using Uniswap Pool (UniswapV2Pair)
*/
contract TestPrice {
    using OracleLibrary for OracleStore;

    mapping(address => OracleStore) public poolsStore;

    function testFetchPrice(address pool, address baseToken) public returns (
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
