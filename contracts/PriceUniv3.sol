// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

contract PriceUniv3 {
    function peek(address pool, uint quoteTokenIndex, uint32 secondAgo) 
    public view 
    returns (uint160 sqrtTwapX96, uint160 sqrtSpotX96) {
        (sqrtSpotX96,,,,,,) = IUniswapV3Pool(pool).slot0();

        (int24 arithmeticMeanTick,) = OracleLibrary.consult(pool, secondAgo);
        sqrtTwapX96 = TickMath.getSqrtRatioAtTick(arithmeticMeanTick);

        if (quoteTokenIndex == 0) {
            sqrtSpotX96 = uint160((1 << 192) / uint(sqrtSpotX96));
            sqrtTwapX96 = uint160((1 << 192) / uint(sqrtTwapX96));
        }
    }
}