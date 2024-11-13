const { deployContract, contractAt, sendTxn, readTmpAddresses, callWithRetries } = require("../shared/helpers")
const { bigNumberify, expandDecimals } = require("../../test/shared/utilities")
const { toChainlinkPrice } = require("../../test/shared/chainlink")

const network = (process.env.HARDHAT_NETWORK || 'mainnet');
const tokens = require('./tokens')[network];

// TODO: update timelock address
async function getArbValues() {
  const vault = await contractAt("Vault", "0x46198Cf18E114B76C84199736cd0dFF703D532A9")
  const glpManager = await contractAt("GlpManager", "0x1a9788574b320F73C0aa0182B0d321F3c2A5DC9b")
  const timelock = await contractAt("Timelock", "0xF3Cf3D73E00D3149BA25c55951617151C67b2350")
  const reader = await contractAt("Reader", "0xD8BA8174749Cb5Cb6F19fe3f1A90C937272B9632")

  const { btc, eth, usdce, usdc, link, uni, usdt, mim, frax, dai } = tokens
  const tokenArr = [ btc, eth, usdce, usdc, link, uni, usdt, mim, frax, dai ]

  const vaultTokenInfo = await reader.getVaultTokenInfoV2(vault.address, eth.address, 1, tokenArr.map(t => t.address))

  return { vault, glpManager, timelock, reader, tokenArr, vaultTokenInfo }
}

async function getAvaxValues() {
  const vault = await contractAt("Vault", "0x9ab2De34A33fB459b538c43f251eB825645e8595")
  const glpManager = await contractAt("GlpManager", "0xD152c7F25db7F4B95b7658323c5F33d176818EE4")
  const timelock = await contractAt("Timelock", "0x60145eEd66E1917B4bDd4754c03b7998B616687A")
  const reader = await contractAt("Reader", "0x2eFEE1950ededC65De687b40Fd30a7B5f4544aBd")

  const { avax, eth, btc, btcb, usdce, usdc } = tokens
  const tokenArr = [ avax, eth, btc, btcb, usdce, usdc ]

  const vaultTokenInfo = await reader.getVaultTokenInfoV2(vault.address, avax.address, 1, tokenArr.map(t => t.address))

  return { vault, glpManager, timelock, reader, tokenArr, vaultTokenInfo }
}

async function getValues() {
  if (network === "arbitrum") {
    return getArbValues()
  }

  if (network === "avax") {
    return getAvaxValues()
  }
}

async function main() {
  const { vault, glpManager, timelock, reader, tokenArr, vaultTokenInfo } = await getValues()

  console.log("vault", vault.address)
  console.log("timelock", timelock.address)

  const vaultPropsLength = 14;

  const shouldSendTxn = true

  let totalUsdgAmount = bigNumberify(0)

  for (const [i, tokenItem] of tokenArr.entries()) {
    const token = {}
    token.poolAmount = vaultTokenInfo[i * vaultPropsLength]
    token.reservedAmount = vaultTokenInfo[i * vaultPropsLength + 1]
    token.availableAmount = token.poolAmount.sub(token.reservedAmount)
    token.usdgAmount = vaultTokenInfo[i * vaultPropsLength + 2]
    token.redemptionAmount = vaultTokenInfo[i * vaultPropsLength + 3]
    token.weight = vaultTokenInfo[i * vaultPropsLength + 4]
    token.bufferAmount = vaultTokenInfo[i * vaultPropsLength + 5]
    token.maxUsdgAmount = vaultTokenInfo[i * vaultPropsLength + 6]
    token.globalShortSize = vaultTokenInfo[i * vaultPropsLength + 7]
    token.maxGlobalShortSize = vaultTokenInfo[i * vaultPropsLength + 8]
    token.minPrice = vaultTokenInfo[i * vaultPropsLength + 9]
    token.maxPrice = vaultTokenInfo[i * vaultPropsLength + 10]
    token.guaranteedUsd = vaultTokenInfo[i * vaultPropsLength + 11]

    token.availableUsd = tokenItem.isStable
      ? token.poolAmount
          .mul(token.minPrice)
          .div(expandDecimals(1, tokenItem.decimals))
      : token.availableAmount
          .mul(token.minPrice)
          .div(expandDecimals(1, tokenItem.decimals));

    token.managedUsd = token.availableUsd.add(token.guaranteedUsd);
    token.managedAmount = token.managedUsd
      .mul(expandDecimals(1, tokenItem.decimals))
      .div(token.minPrice);

    let usdgAmount = token.managedUsd.div(expandDecimals(1, 30 - 18))
    totalUsdgAmount = totalUsdgAmount.add(usdgAmount)

    const adjustedMaxUsdgAmount = expandDecimals(tokenItem.maxUsdgAmount, 18)
    // if (usdgAmount.gt(adjustedMaxUsdgAmount)) {
    //   usdgAmount = adjustedMaxUsdgAmount
    // }
  }

  console.log("totalUsdgAmount", totalUsdgAmount.toString())

  if (shouldSendTxn) {
    await sendTxn(timelock.updateUsdgSupply(glpManager.address, totalUsdgAmount), "timelock.updateUsdgSupply")
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
