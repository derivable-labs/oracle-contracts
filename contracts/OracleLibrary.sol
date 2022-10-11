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
    FixedPoint.uq112x112 baseTWAP;
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
        self.basePriceCumulative = uint224(priceCumulative);
        self.blockTimestamp = blockTimestamp;
    }

    function fetchPrice(
        OracleStore storage self,
        address pair,
        bool baseToken0
    )
        internal
        returns (
            OraclePrice memory twap,
            OraclePrice memory naive
        )
    {
        require(self.blockTimestamp > 0, "uninitialized");
        uint basePriceCumulative;

        if (self.blockTimestamp < block.timestamp) {
            uint32 blockTimestamp;
            (basePriceCumulative, blockTimestamp) =
                UniswapV2OracleLibrary.currentCumulativePrice(pair, baseToken0);
            if (blockTimestamp == self.blockTimestamp) {
                twap.base = self.baseTWAP;
            } else {
                twap.base = FixedPoint.uq112x112(uint224(
                    (basePriceCumulative - self.basePriceCumulative) /
                    (blockTimestamp - self.blockTimestamp)
                ));
                self.basePriceCumulative = basePriceCumulative;
                self.baseTWAP = twap.base;
                self.blockTimestamp = blockTimestamp;
            }
        } else {
            basePriceCumulative = self.basePriceCumulative;
            twap.base = self.baseTWAP;
        }

        uint256 totalSupply = IUniswapV2Pair(pair).totalSupply();
        (uint r0, uint r1, ) = IUniswapV2Pair(pair).getReserves();

        twap.LP = FixedPoint.fraction(2 * Math.sqrt(r0 * r1), totalSupply).muluq(twap.base.sqrt());

        (uint rb, uint rq) = baseToken0 ? (r0, r1) : (r1, r0);
        naive.base = FixedPoint.fraction(rq, rb);
        naive.LP = FixedPoint.fraction(2 * rq, totalSupply);
    }
}
