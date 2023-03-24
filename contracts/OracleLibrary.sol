// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./@uniswap/lib/contracts/libraries/FixedPoint.sol";
import "./@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "./@uniswap/v2-periphery/contracts/libraries/UniswapV2OracleLibrary.sol";
import "./PriceLibrary.sol";
import "./Math.sol";
import "hardhat/console.sol";

struct OracleStore {
    uint basePriceCumulative;
    uint32 blockTimestamp;
    uint224 baseTWAP;
}

library OracleLibrary {
    using FixedPoint for FixedPoint.uq112x112;

    function init(
        OracleStore storage self,
        address pair,
        uint quoteTokenIndex
    ) internal {
        require(self.blockTimestamp == 0, "initialized");
        (uint priceCumulative, uint32 blockTimestamp) =
            UniswapV2OracleLibrary.currentCumulativePrice(address(pair), quoteTokenIndex == 1);
        self.basePriceCumulative = priceCumulative;
        self.blockTimestamp = blockTimestamp;
    }

    function fetchPrice(
        OracleStore storage self,
        address pair,
        uint quoteTokenIndex,
        uint period
    )
        internal
        returns (
            uint224 twap,
            uint224 spot
        )
    {
        OracleStore memory updated;
        (twap, spot, updated) = peekPrice(self, pair, quoteTokenIndex);
        
        if ((updated.blockTimestamp != 0) && (updated.blockTimestamp - self.blockTimestamp >= period)) {
            self.basePriceCumulative = updated.basePriceCumulative;
            self.blockTimestamp = updated.blockTimestamp;
            self.baseTWAP = updated.baseTWAP;
        }
        return (twap, spot);
    }

    function peekPrice(
        OracleStore memory self,
        address pair,
        uint quoteTokenIndex
    )
        internal view
        returns (
            uint224 twap,
            uint224 spot,
            OracleStore memory updated
        )
    {
        require(self.blockTimestamp > 0, "uninitialized");
        uint basePriceCumulative;
        if (self.blockTimestamp < block.timestamp) {
            uint32 blockTimestamp;
            (basePriceCumulative, blockTimestamp) =
                UniswapV2OracleLibrary.currentCumulativePrice(pair, quoteTokenIndex == 1);
            if (blockTimestamp == self.blockTimestamp) {
                twap = self.baseTWAP;
            } else {
                twap = uint224(
                    (basePriceCumulative - self.basePriceCumulative) /
                    (blockTimestamp - self.blockTimestamp)
                );
                updated = OracleStore(
                    basePriceCumulative,
                    blockTimestamp,
                    twap
                );
            }
        } else {
            basePriceCumulative = self.basePriceCumulative;
            twap = self.baseTWAP;
        }
        (uint r0, uint r1, ) = IUniswapV2Pair(pair).getReserves();

        (uint rb, uint rq) = quoteTokenIndex == 1 ? (r0, r1) : (r1, r0);
        spot = FixedPoint.fraction(rq, rb)._x;
    }
}
