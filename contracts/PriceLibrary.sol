// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@uniswap/lib/contracts/libraries/FixedPoint.sol';

struct Price {
    FixedPoint.uq112x112 base;
    FixedPoint.uq112x112 LP;
}

library PriceLibrary {
    using FixedPoint for FixedPoint.uq112x112;
    using PriceLibrary for Price;

    function isEmpty(Price memory self) public returns (bool) {
        return self.base._x == 0;
    }
}
