const { deployContract, contractAt, sendTxn } = require("../shared/helpers")
const { expandDecimals } = require("../../test/shared/utilities")

async function main() {
  const btcPriceFeed = await contractAt("PriceFeed", "0x282468a2D54fd44adaa5CCC4CF749ccF2475f124")
  const ethPriceFeed = await contractAt("PriceFeed", "0x037AbD8fB6A9265BE3bfeE442fd68a679AcB19E2")
  const bnbPriceFeed = await contractAt("PriceFeed", "0x98af3094926b380F12f570b75916410351755799")
  const busdPriceFeed = await contractAt("PriceFeed", "0xAF0E9F307746760843365A04aa05C0085576b844")
  const usdcPriceFeed = await contractAt("PriceFeed", "0xCb3967159c99761B3AB53aeb03cD48E71Cd2d3e5")
  const usdtPriceFeed = await contractAt("PriceFeed", "0x8A805c1B8748C2930B3AbFd896B44D335ea32DDb")
  const priceDecimals = 8

  const btc = {
    symbol: "BTC",
    address: "0xd550Cc2aF6158b9B7ea006E8afbC6095E176F079",
    priceFeed: btcPriceFeed
  }
  const eth = {
    symbol: "ETH",
    address: "0xd4A1105011f9982cdCb48658C44c2dfdfe099f72",
    priceFeed: ethPriceFeed
  }
  const bnb = {
    symbol: "BNB",
    address: "0x43ee06bD90e143D75fe8fA2F58acA223b1Fa7E80",
    priceFeed: bnbPriceFeed
  }
  const busd = {
    symbol: "BUSD",
    address: "0xab6C2805b98865F406F989C87b6cf76d7Cd58C68",
    priceFeed: busdPriceFeed
  }
  const usdc = {
    symbol: "USDC",
    address: "0xEe9B9d6E7f5813a34bFcBFFa35fA4D1926437ed2",
    priceFeed: usdcPriceFeed
  }
  const usdt = {
    symbol: "USDT",
    address: "0x11b93463427c026D4b5b2A9E47459D2054A54728",
    priceFeed: usdtPriceFeed
  }

  const tokens = [btc, eth, bnb, busd, usdc, usdt]

  const now = parseInt(Date.now() / 1000)

  for (let i = 0; i < tokens.length; i++) {
    const { symbol, priceFeed } = tokens[i]
    const latestRound = await priceFeed.latestRound()

    for (let j = 0; j < 5; j++) {
      const roundData = await priceFeed.getRoundData(latestRound.sub(j))
      const answer = roundData[1]
      const updatedAt = roundData[3]
      console.log(`${symbol} ${j}: ${ethers.utils.formatUnits(answer, priceDecimals)}, ${updatedAt}, ${updatedAt.sub(now).toString()}s, ${updatedAt.sub(now).div(60).toString()}m`)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
