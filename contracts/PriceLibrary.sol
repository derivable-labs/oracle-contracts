// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import './@uniswap/lib/contracts/libraries/FixedPoint.sol';

struct OraclePrice {
    FixedPoint.uq112x112 base;
    FixedPoint.uq112x112 LP;
}

library PriceLibrary {
    using FixedPoint for FixedPoint.uq112x112;
    using PriceLibrary for OraclePrice;

    function isEmpty(OraclePrice memory self) public pure returns (bool) {
        return self.base._x == 0 && self.LP._x == 0;
    }

    function divuq(OraclePrice memory self, FixedPoint.uq112x112 memory scale) public pure returns (OraclePrice memory) {
        return OraclePrice(
            self.base.divuq(scale),
            self.LP.divuq(scale.sqrt())
        );
    }
}
