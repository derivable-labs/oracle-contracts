const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const {expect} = require("chai");

const LARGE_VALUE =
  '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
const bn = ethers.BigNumber.from

const numberToWei = (number, decimal = 18) => {
  return ethers.utils.parseUnits(number.toString(), decimal)
}

const opts = {
  gasLimit: 30000000
}

describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    // var provider = new ethers.providers.WebSocketProvider("ws://localhost:8545");
    var signer = owner;

    const compiledUniswapFactory = require("@uniswap/v2-core/build/UniswapV2Factory.json");
    var UniswapFactory = await new ethers.ContractFactory(compiledUniswapFactory.interface, compiledUniswapFactory.bytecode, signer);
    const compiledWETH = require("canonical-weth/build/contracts/WETH9.json")
    var WETH = await new ethers.ContractFactory(compiledWETH.abi, compiledWETH.bytecode, signer);

    const compiledUniswapRouter = require("@uniswap/v2-periphery/build/UniswapV2Router02");
    var UniswapRouter = await new ethers.ContractFactory(compiledUniswapRouter.abi, compiledUniswapRouter.bytecode, signer);

    const compiledERC20 = require("@uniswap/v2-core/build/ERC20.json");
    var erc20Factory = new ethers.ContractFactory(compiledERC20.abi, compiledERC20.bytecode, signer);

    var token0 = await erc20Factory.deploy(numberToWei(100000000));
    var token1 = await erc20Factory.deploy(numberToWei(100000000));
    var weth = await WETH.deploy();
    const uniswapFactory = await UniswapFactory.deploy(token0.address)
    const uniswapRouter = await UniswapRouter.deploy(uniswapFactory.address, weth.address)

    await token0.approve(uniswapRouter.address, LARGE_VALUE)
    await token1.approve(uniswapRouter.address, LARGE_VALUE)

    await uniswapRouter.addLiquidity(
      token0.address,
      token1.address,
      numberToWei(10),
      numberToWei(10),
      '1000000000000000',
      '1000000000000000',
      owner.address,
      new Date().getTime() + 100000,
      opts
    )

    const pairAddresses = await uniswapFactory.allPairs(0)

    // deploy test price contract
    const Lib = await ethers.getContractFactory("OracleLibrary", signer);
    const lib = await Lib.deploy();
    await lib.deployed();
    const TestPrice = await ethers.getContractFactory("TestPrice", {
      signer,
      libraries: {
        OracleLibrary: lib.address,
      },
    });
    const testpriceContract = await TestPrice.deploy()
    await testpriceContract.deployed();

    return {token0, token1, uniswapRouter, owner, pairAddresses, testpriceContract}
  }

  function convertFixedToNumber(fixed) {
    const unit = 1000;

    return bn(fixed)
      .mul(unit)
      .div(bn(2).pow(112))
      .toNumber() / unit

  }

  describe("Deployment", function () {
    it("difference of twap price less than difference of naive price", async function () {
      const {
        token0,
        token1,
        owner,
        pairAddresses,
        uniswapRouter,
        testpriceContract
      } = await loadFixture(deployOneYearLockFixture);
      token0.approve(uniswapRouter.address, LARGE_VALUE);

      // init pool store
      const tx = await testpriceContract.testFetchPrice(pairAddresses, token0.address);
      await tx.wait(1);

      // get price before update price
      // base price = 1, naive price = 1, cumulative price = 1
      const priceRes1 = await testpriceContract.callStatic.testFetchPrice(pairAddresses, token0.address);
      const price1 = {
        twap_base: convertFixedToNumber(priceRes1.twap.base[0]),
        twap_LP: convertFixedToNumber(priceRes1.twap.LP[0]),
        naive_base: convertFixedToNumber(priceRes1.naive.base[0]),
        naive_LP: convertFixedToNumber(priceRes1.naive.LP[0])
      }
      await time.increase(100)

      // swap to change price
      const tx1 = await uniswapRouter.swapExactTokensForTokens(
        numberToWei(10),
        0,
        [token0.address, token1.address],
        owner.address,
        new Date().getTime() + 10000,
        opts
      )
      await tx1.wait(1)
      await time.increase(10);

      // get price after 10s
      const priceRes2 = await testpriceContract.callStatic.testFetchPrice(pairAddresses, token0.address);
      const price2 = {
        twap_base: convertFixedToNumber(priceRes2.twap.base[0]),
        twap_LP: convertFixedToNumber(priceRes2.twap.LP[0]),
        naive_base: convertFixedToNumber(priceRes2.naive.base[0]),
        naive_LP: convertFixedToNumber(priceRes2.naive.LP[0])
      }

      const twapBaseDiff1 = Math.abs(price1.twap_base - price2.twap_base) / price1.twap_base
      const naiveBaseDiff1 = Math.abs(price1.naive_base - price2.naive_base) / price1.naive_base
      const twapLPDiff1 = Math.abs(price1.twap_LP - price2.twap_LP) / price1.twap_base
      const naiveLPDiff1 = Math.abs(price1.naive_LP - price2.naive_LP) / price1.naive_base

      // check the difference of twap price < difference of naive price
      expect(twapBaseDiff1).to.lessThan(naiveBaseDiff1)
      expect(twapLPDiff1).to.lessThan(naiveLPDiff1)

      // check the naive price 1 = naive price 2
      expect(price1.naive_base).to.lessThan(price2.naive_base)
      expect(price1.naive_LP).to.lessThan(price2.naive_LP)

      // after many time
      // the difference of twap price still < difference of naive price
      // but difference of twap price still in the last time < difference of twap price still in this time
      await time.increase(10000);
      const priceRes3 = await testpriceContract.callStatic.testFetchPrice(pairAddresses, token0.address);
      const price3 = {
        twap_base: convertFixedToNumber(priceRes3.twap.base[0]),
        twap_LP: convertFixedToNumber(priceRes3.twap.LP[0]),
        naive_base: convertFixedToNumber(priceRes3.naive.base[0]),
        naive_LP: convertFixedToNumber(priceRes3.naive.LP[0])
      }
      const twapBaseDiff2 = Math.abs(price1.twap_base - price3.twap_base) / price1.twap_base
      const naiveBaseDiff2 = Math.abs(price1.naive_base - price3.naive_base) / price1.naive_base
      const twapLPDiff2 = Math.abs(price1.twap_LP - price3.twap_LP) / price1.twap_base
      const naiveLPDiff2 = Math.abs(price1.naive_LP - price3.naive_LP) / price1.naive_base

      expect(twapBaseDiff1).to.lessThan(twapBaseDiff2)
      expect(twapLPDiff1).to.lessThan(twapLPDiff2)

      expect(twapBaseDiff2).to.lessThan(naiveBaseDiff2)
      expect(twapLPDiff2).to.lessThan(naiveLPDiff2)

      console.log(price1, price2, price3)
    });
  });
});
