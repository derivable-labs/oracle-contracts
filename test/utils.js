const ONE = ethers.BigNumber.from(1);
const TWO = ethers.BigNumber.from(2);

const bn = ethers.BigNumber.from
const numberToWei = (number, decimal = 18) => {
  return ethers.utils.parseUnits(number.toString(), decimal)
}

const weiToNumber = (number, decimal = 18) => {
  return ethers.utils.formatUnits(number.toString(), decimal)
}

const calculateSwapToPrice = ({r0, r1, token0, token1}, targetPrice, quoteToken) => {
  targetPrice = numberToWei(targetPrice)

  const [rb, rq] = quoteToken === token0 ? [r1, r0] : [r0, r1];
  const oldPrice = rq.mul(numberToWei(1)).div(rb)

  if (targetPrice.gt(oldPrice)) {
    const a = bn(997)
    const b = rq.mul(1000).add(rq.mul(997))
    const c1 = rq.mul(rq).mul(1000)
    const c2 = targetPrice.mul(rq).mul(rb).mul(1000).div(numberToWei(1))

    const {x1, x2} = quadraticEquation(a, b, c1.sub(c2))
    return {
      amount: x1.isNegative() ? x2 : x1,
      tokenInput: quoteToken === token0 ? token0 : token1
    }

  } else {
    const a = bn(997)
    const b = rb.mul(997).add(rb.mul(1000))
    const c1 = rb.mul(rb).mul(1000)
    const c2 = rq.mul(rb).mul(1000).mul(numberToWei(1)).div(targetPrice)
    const {x1, x2} = quadraticEquation(a, b, c1.sub(c2))
    return {
      amount: x1.isNegative() ? x2 : x1,
      tokenInput: quoteToken === token0 ? token1 : token0
    }
  }
}

function sqrt(value) {
  const x = ethers.BigNumber.from(value);
  let z = x.add(ONE).div(TWO);
  let y = x;
  while (z.sub(y).isNegative()) {
    y = z;
    z = x.div(z).add(z).div(TWO);
  }
  return y;
}


function quadraticEquation(a, b, c) {
  var x1, x2;
  // delta = b^2 - 4ac
  const delta = b.mul(b).sub(bn(4).mul(a).mul(c))
  if (delta.isZero()) {
    x1 = undefined
    x2 = undefined
  } else if (delta.lt(0)) {
    // x1 = x2 = -sqrt(delta) / 2a
    x1 = bn(0).sub(sqrt(delta)).div(a.mul(2))
    x2 = bn(0).sub(sqrt(delta)).div(a.mul(2))
  } else {
    // x1 = (-b - sqrt(delta)) / 2a
    // x2 = (-b + sqrt(delta)) / 2a
    x1 = bn(0).sub(b).add(sqrt(delta)).div(a.mul(2))
    x2 = bn(0).sub(b).sub(sqrt(delta)).div(a.mul(2))
  }
  return {x1, x2}
}


module.exports = {
  calculateSwapToPrice,
  weiToNumber,
  numberToWei,
  bn
}
