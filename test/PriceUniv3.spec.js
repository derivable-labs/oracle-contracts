const {
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const chai = require("chai");
const { bn, numberToWei, stringToBytes32, encodeSqrtX96 } = require("./shared/utilities");
const expect = chai.expect;

const pe = (x) => ethers.utils.parseEther(String(x))

describe("Pool", () => {
  async function setup() {
    const [owner, otherAccounts] = await ethers.getSigners();
    const signer = owner;
    //WETH
    const compiledWETH = require("canonical-weth/build/contracts/WETH9.json")
    const WETH = await new ethers.ContractFactory(compiledWETH.abi, compiledWETH.bytecode, signer);
    // erc20 factory
    const compiledERC20 = require("@uniswap/v2-core/build/ERC20.json");
    const erc20Factory = new ethers.ContractFactory(compiledERC20.abi, compiledERC20.bytecode, signer);
    // uniswap factory
    const compiledUniswapFactory = require("./compiled/UniswapV3Factory.json");
    const UniswapFactory = await new ethers.ContractFactory(compiledUniswapFactory.abi, compiledUniswapFactory.bytecode, signer);
    const uniswapFactory = await UniswapFactory.deploy()
    // uniswap router
    const compiledUniswapv3Router = require("./compiled/SwapRouter.json");
    const Uniswapv3Router = new ethers.ContractFactory(compiledUniswapv3Router.abi, compiledUniswapv3Router.bytecode, signer);
    // uniswap PM
    const compiledUniswapv3PositionManager = require("./compiled/NonfungiblePositionManager.json");
    const Uniswapv3PositionManager = new ethers.ContractFactory(compiledUniswapv3PositionManager.abi, compiledUniswapv3PositionManager.bytecode, signer);
   
    // setup uniswap
    const usdc = await erc20Factory.deploy(numberToWei(100000000));
    const weth = await WETH.deploy();
    await uniswapFactory.createPool(usdc.address, weth.address, 500)
    const uniswapv3Router = await Uniswapv3Router.deploy(uniswapFactory.address, weth.address);

    const uniswapv3PositionManager = await Uniswapv3PositionManager.deploy(uniswapFactory.address, weth.address, '0x0000000000000000000000000000000000000000')

    const compiledUniswapPool = require("./compiled/UniswapV3Pool.json");
    const pairAddress = await uniswapFactory.getPool(usdc.address, weth.address, 500)
    const uniswapPair = new ethers.Contract(pairAddress, compiledUniswapPool.abi, signer);
  
    // deploy
    const quoteTokenIndex = weth.address.toLowerCase() < usdc.address.toLowerCase() ? 1 : 0
    const initPriceX96 = encodeSqrtX96(quoteTokenIndex ? 1500 : 1, quoteTokenIndex ? 1 : 1500)
    await uniswapPair.initialize(initPriceX96)

    const OracleFactory = await ethers.getContractFactory('PriceUniv3');
    const oracle = await OracleFactory.deploy()

    return {
      owner,
      usdc,
      weth,
      uniswapPair,
      uniswapv3Router,
      uniswapv3PositionManager,
      oracle
    }
  } 

  it("Deploy", async () => {
    const {
      usdc,
      weth,
      uniswapPair,
      oracle
    } = await loadFixture(setup);
    await oracle.peek(uniswapPair.address, 0, 1)
    await oracle.peek(uniswapPair.address, 1, 1)
  })
})