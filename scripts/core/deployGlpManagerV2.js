const { deployContract, contractAt , sendTxn, writeTmpAddresses, callWithRetries } = require("../shared/helpers")
const { expandDecimals } = require("../../test/shared/utilities")
const { toUsd } = require("../../test/shared/units")

const network = (process.env.HARDHAT_NETWORK || 'mainnet');
const tokens = require('./tokens')[network];

async function getArbValues() {
  const vault = { address: "0x46198Cf18E114B76C84199736cd0dFF703D532A9" }
  const usdg = { address: "0xBC08B53ba94548194e7a643364773081A923EA0B" }
  const glp = { address: "0x2b8757c8B6BD5D614cbF6c585B8d0e736a1AB77b" }
  const shortsTracker = { address: "0x2f30C6d3807134eC0F036887553E2558C6AB039F" }

  return { vault, usdg, glp, shortsTracker }
}

async function getAvaxValues() {
  const vault = { address: "0x9ab2De34A33fB459b538c43f251eB825645e8595" }
  const usdg = { address: "0xc0253c3cC6aa5Ab407b5795a04c28fB063273894" }
  const glp = { address: "0x01234181085565ed162a948b6a5e88758CD7c7b8" }
  const shortsTracker = { address: "0x9234252975484D75Fd05f3e4f7BdbEc61956D73a" }

  return { vault, usdg, glp, shortsTracker }
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
  const { vault, usdg, glp, shortsTracker } = await getValues()

  const cooldownDuration = 0
  const glpManager = await deployContract("GlpManager", [vault.address, usdg.address, glp.address, shortsTracker.address, cooldownDuration])

  await sendTxn(glpManager.setInPrivateMode(true), "glpManager.setInPrivateMode")

  writeTmpAddresses({
    glpManager: glpManager.address
  })
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
