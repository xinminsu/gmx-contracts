const { getFrameSigner, deployContract, contractAt, sendTxn, writeTmpAddresses } = require("../shared/helpers")

const network = (process.env.HARDHAT_NETWORK || 'mainnet');

async function getArbValues() {
  const glp = { address: "0x2b8757c8B6BD5D614cbF6c585B8d0e736a1AB77b" }
  const glpManager = { address: "0x1a9788574b320F73C0aa0182B0d321F3c2A5DC9b" }
  const stakedGlpTracker = await contractAt("RewardTracker", "0x1aDDD80E6039594eE970E5872D247bf0414C8903")
  const feeGlpTracker = await contractAt("RewardTracker", "0x4e971a87900b931fF39d1Aad67697F49835400b6")

  return { glp, glpManager, stakedGlpTracker, feeGlpTracker }
}

async function getAvaxValues() {
  const glp = { address: "0x01234181085565ed162a948b6a5e88758CD7c7b8" }
  const glpManager = { address: "0xe1ae4d4b06A5Fe1fc288f6B4CD72f9F8323B107F" }
  const stakedGlpTracker = await contractAt("RewardTracker", "0x9e295B5B976a184B14aD8cd72413aD846C299660")
  const feeGlpTracker = await contractAt("RewardTracker", "0xd2D1162512F927a7e282Ef43a362659E4F2a728F")

  return { glp, glpManager, stakedGlpTracker, feeGlpTracker }
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
  const signer = await getFrameSigner()
  const { glp, glpManager, stakedGlpTracker, feeGlpTracker } = await getValues()

  const timelock = await contractAt("Timelock", await stakedGlpTracker.gov(), signer)

  const stakedGlp = await deployContract("StakedGlp", [
    glp.address,
    glpManager.address,
    stakedGlpTracker.address,
    feeGlpTracker.address
  ])

  await sendTxn(timelock.signalSetHandler(stakedGlpTracker.address, stakedGlp.address, true), "timelock.signalSetHandler(stakedGlpTracker)")
  await sendTxn(timelock.signalSetHandler(feeGlpTracker.address, stakedGlp.address, true), "timelock.signalSetHandler(stakedGlpTracker)")

  // await deployContract("GlpBalance", [glpManager.address, stakedGlpTracker.address])
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
