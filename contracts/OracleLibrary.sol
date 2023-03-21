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
        bool baseToken0
    ) internal {
        require(self.blockTimestamp == 0, "initialized");
        (uint priceCumulative, uint32 blockTimestamp) =
            UniswapV2OracleLibrary.currentCumulativePrice(address(pair), baseToken0);
        self.basePriceCumulative = priceCumulative;
        self.blockTimestamp = blockTimestamp;
    }

    function fetchPrice(
        OracleStore storage self,
        address pair,
        bool baseToken0
    )
        internal
        returns (
            uint224 twap,
            uint224 naive
        )
    {
        OracleStore memory updated;
        (twap, naive, updated) = peekPrice(self, pair, baseToken0);
        if (self.blockTimestamp < updated.blockTimestamp) {
            self.basePriceCumulative = updated.basePriceCumulative;
            self.blockTimestamp = updated.blockTimestamp;
            self.baseTWAP = updated.baseTWAP;
        }
        return (twap, naive);
    }

    function peekPrice(
        OracleStore memory self,
        address pair,
        bool baseToken0
    )
        internal view
        returns (
            uint224 twap,
            uint224 naive,
            OracleStore memory updated
        )
    {
        require(self.blockTimestamp > 0, "uninitialized");
        uint basePriceCumulative;
        if (self.blockTimestamp < block.timestamp) {
            uint32 blockTimestamp;
            (basePriceCumulative, blockTimestamp) =
                UniswapV2OracleLibrary.currentCumulativePrice(pair, baseToken0);
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

        (uint rb, uint rq) = baseToken0 ? (r0, r1) : (r1, r0);
        naive = FixedPoint.fraction(rq, rb)._x;
    }
}
