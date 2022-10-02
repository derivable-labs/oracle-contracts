const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Lock", function () {
  async function mineBlocks(blockNumber) {
    while (blockNumber > 0) {
      blockNumber--;
      await hre.network.provider.request({
        method: "evm_mine",
        params: [],
      });
    }
  }

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const lockedAmount = ONE_GWEI;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const StandardToken = await ethers.getContractFactory("StandardToken");
    const token0 = await StandardToken.deploy("token 0", "token0");
    const token1 = await StandardToken.deploy("Multichain Dex Coin", "token1");
    const Pool = await ethers.getContractFactory("Pair");
    const pool = await Pool.deploy();

    const Lib = await ethers.getContractFactory("OracleLibrary");
    const lib = await Lib.deploy();
    await lib.deployed();
    const TestPrice = await ethers.getContractFactory("TestPrice", {
      libraries: {
        OracleLibrary: lib.address,
      },
    });
    const testpriceContract = await TestPrice.deploy()

    await token0.connect(owner).transfer(pool.address, '100000000')
    await token1.connect(owner).transfer(pool.address, '100000000')
    await pool.initialize(token0.address, token1.address)

    await pool.sync()

    await testpriceContract.updateStore(pool.address, 0);

    // console.log('currentBlock', currentBlock)
    // console.log('block1000', block1000)

    return {token0, token1, pool, testpriceContract}
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { token0, token1, pool, testpriceContract } = await loadFixture(deployOneYearLockFixture);
      // const res = await pool.getReserves()

      const res = await testpriceContract.callStatic.testFetchPrice(pool.address, 0);
      // const currentBlock = await ethers.provider.getBlock()
      // await mineBlocks(10)
      // const block1000 = await ethers.provider.getBlock()

      // expect(await lock.unlockTime()).to.equal(unlockTime);
    });
  });
});
