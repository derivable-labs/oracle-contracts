const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
    bn,
    calculateSwapToPrice,
    numberToWei,
    weiToNumber,
} = require("./utils");

const LARGE_VALUE =
    "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";

const opts = {
    gasLimit: 30000000,
};

describe("LP price", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployPriceOracle() {
        const [owner, otherAccount] = await ethers.getSigners();

        // var provider = new ethers.providers.WebSocketProvider("ws://localhost:8545");
        var signer = owner;

        const compiledUniswapFactory = require("@uniswap/v2-core/build/UniswapV2Factory.json");
        var UniswapFactory = await new ethers.ContractFactory(
            compiledUniswapFactory.interface,
            compiledUniswapFactory.bytecode,
            signer,
        );
        const compiledWETH = require("canonical-weth/build/contracts/WETH9.json");
        var WETH = await new ethers.ContractFactory(
            compiledWETH.abi,
            compiledWETH.bytecode,
            signer,
        );

        const compiledUniswapRouter = require("@uniswap/v2-periphery/build/UniswapV2Router02");
        var UniswapRouter = await new ethers.ContractFactory(
            compiledUniswapRouter.abi,
            compiledUniswapRouter.bytecode,
            signer,
        );

        const compiledERC20 = require("@uniswap/v2-core/build/ERC20.json");
        var erc20Factory = new ethers.ContractFactory(
            compiledERC20.abi,
            compiledERC20.bytecode,
            signer,
        );

        var busd = await erc20Factory.deploy(numberToWei(100000000));
        var eth = await erc20Factory.deploy(numberToWei(100000000));
        var weth = await WETH.deploy();
        const uniswapFactory = await UniswapFactory.deploy(busd.address);
        const uniswapRouter = await UniswapRouter.deploy(
            uniswapFactory.address,
            weth.address,
        );

        await busd.approve(uniswapRouter.address, LARGE_VALUE);
        await eth.approve(uniswapRouter.address, LARGE_VALUE);

        await uniswapRouter.addLiquidity(
            busd.address,
            eth.address,
            "9250619149041644050058396",
            "6986963283651477901852",
            "0",
            "0",
            owner.address,
            new Date().getTime() + 100000,
            opts,
        );

        const pairAddresses = await uniswapFactory.allPairs(0);

        // deploy test price contract
        const Lib = await ethers.getContractFactory("OracleLibrary");
        const lib = await Lib.deploy();
        await lib.deployed();
        const TestPrice = await ethers.getContractFactory("TestPrice");
        const testpriceContract = await TestPrice.deploy();
        await testpriceContract.deployed();

        busd.approve(uniswapRouter.address, LARGE_VALUE);
        eth.approve(uniswapRouter.address, LARGE_VALUE);

        // init pool store
        const tx = await testpriceContract.testFetchPrice(
            pairAddresses,
            eth.address,
        );
        await tx.wait(1);

        // get price before update price
        // base price = 1, naive price = 1, cumulative price = 1
        const initPrice = formatFetchPriceResponse(
            await testpriceContract.callStatic.testFetchPrice(
                pairAddresses,
                eth.address,
            ),
        );

        const poolContract = new ethers.Contract(
            pairAddresses,
            require("@uniswap/v2-core/build/UniswapV2Pair.json").abi,
            signer,
        );

        return {
            busd,
            eth,
            uniswapRouter,
            poolContract,
            owner,
            initPrice,
            pairAddresses,
            testpriceContract,
        };
    }

    function convertFixedToNumber(fixed) {
        const unit = 1000;

        return bn(fixed).mul(unit).shr(112).toNumber() / unit;
    }

    function formatFetchPriceResponse(priceRes) {
        return {
            twap_base: convertFixedToNumber(priceRes.twap.base[0]),
            twap_LP: convertFixedToNumber(priceRes.twap.LP[0]),
            naive_base: convertFixedToNumber(priceRes.naive.base[0]),
            naive_LP: convertFixedToNumber(priceRes.naive.LP[0]),
        };
    }

    function getDiffPercent(num1, num2) {
        return (100 * Math.abs(num1 - num2)) / num1;
    }

    async function swapToSetPrice({
        account,
        poolContract,
        uniswapRouter,
        quoteToken,
        targetPrice,
    }) {
        const [[r0, r1], token0, token1] = await Promise.all([
            poolContract.getReserves(),
            poolContract.token0(),
            poolContract.token1(),
        ]);

        const res = calculateSwapToPrice(
            {
                r0,
                r1,
                token0,
                token1,
            },
            targetPrice,
            quoteToken,
        );

        const tx = await uniswapRouter.swapExactTokensForTokens(
            res.amount,
            0,
            [
                res.tokenInput === token0 ? token0 : token1,
                res.tokenInput === token0 ? token1 : token0,
            ],
            account.address,
            new Date().getTime() + 10000,
            opts,
        );
        await tx.wait(1);
    }

    describe("Deployment", function () {
        it("Get LP price", async function () {
            let contract = await deployPriceOracle()
            let reserves = await contract.poolContract.callStatic.getReserves()
            let totalSupply = await contract.poolContract.callStatic.totalSupply()
            console.log(await contract.poolContract.callStatic.token0(), await contract.poolContract.callStatic.token1())
            console.log(reserves)
            // LP price = (reserves0(toBusd) + reserves1(toBusd)) / totalSupply
        });
    });
});
