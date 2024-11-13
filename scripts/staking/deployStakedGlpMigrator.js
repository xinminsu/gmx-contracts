const { getFrameSigner, deployContract, contractAt, sendTxn, writeTmpAddresses } = require("../shared/helpers")

const network = (process.env.HARDHAT_NETWORK || 'mainnet');

async function getArbValues() {
  const glp = { address: "0x2b8757c8B6BD5D614cbF6c585B8d0e736a1AB77b" }
  const stakedGlpTracker = await contractAt("RewardTracker", "0x1aDDD80E6039594eE970E5872D247bf0414C8903")
  const feeGlpTracker = await contractAt("RewardTracker", "0x4e971a87900b931fF39d1Aad67697F49835400b6")

  return { glp, stakedGlpTracker, feeGlpTracker }
}

async function getValues() {
  if (network === "arbitrum") {
    return getArbValues()
  }
}

async function main() {
  const { glp, stakedGlpTracker, feeGlpTracker } = await getValues()
  const sender = { address: "0x2066a650af4b6895f72e618587aad5e8120b7790" }

  await deployContract("StakedGlpMigrator", [
      sender.address,
      glp.address,
      stakedGlpTracker.address,
      feeGlpTracker.address
  ])
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
