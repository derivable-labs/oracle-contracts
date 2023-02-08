// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct OracleStore {
    uint basePriceCumulative;
    uint32 blockTimestamp;
    uint224 baseTWAP;
}
