const {
  deployContract,
  contractAt,
  sendTxn,
  getFrameSigner
} = require("../shared/helpers")
const { expandDecimals } = require("../../test/shared/utilities")
const { toUsd } = require("../../test/shared/units");
const { getArgumentForSignature } = require("typechain");

const network = (process.env.HARDHAT_NETWORK || 'mainnet');

async function getAvaxValues() {
  return {
    handlers: [
      "0x02270A816FCca45cE078C8b3De0346Eebc90B227", // X Shorts Tracker Keeper
    ]
  }
}

async function getArbValues() {
  return {
    handlers: [
      "0xAef5A80e92dCda69273F3b07b5012e7794034771", // X Shorts Tracker Keeper
    ]
  }
}

async function getValues() {
  if (network === "localhost") {
    return await getLocalhostValues()
  }

  if (network === "avax") {
    return await getAvaxValues()
  }

  if (network === "arbitrum") {
    return await getArbValues()
  }

  throw new Error("No values for network " + network)
}

async function main() {
  const signer = await getFrameSigner()

  const admin = "0x04A7Df5bb513010C7F16d862C3af357cAEdA32F0"
  const { handlers } = await getValues()

  const buffer = 60 // 60 seconds
  const updateDelay = 300 // 300 seconds, 5 minutes
  const maxAveragePriceChange = 20 // 0.2%
  let shortsTrackerTimelock = await deployContract("ShortsTrackerTimelock", [admin, buffer, updateDelay, maxAveragePriceChange])
  shortsTrackerTimelock = await contractAt("ShortsTrackerTimelock", shortsTrackerTimelock.address, signer)

  console.log("Setting handlers")
  for (const handler of handlers) {
    await sendTxn(
      shortsTrackerTimelock.setContractHandler(handler, true),
      `shortsTrackerTimelock.setContractHandler ${handler}`
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
