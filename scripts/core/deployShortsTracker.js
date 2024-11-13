const { getFrameSigner, deployContract, contractAt , sendTxn, readTmpAddresses, writeTmpAddresses } = require("../shared/helpers")
const { expandDecimals } = require("../../test/shared/utilities")
const { toUsd } = require("../../test/shared/units");
const { getArgumentForSignature } = require("typechain");

const network = (process.env.HARDHAT_NETWORK || 'mainnet');
const tokens = require('./tokens')[network];

async function getArbTestnetValues() {
  return { vaultAddress: "0xBc9BC47A7aB63db1E0030dC7B60DDcDe29CF4Ffb", gasLimit: 12500000 }
}

async function getArbValues() {
  return { vaultAddress: "0x46198Cf18E114B76C84199736cd0dFF703D532A9", gasLimit: 12500000 }
}

async function getAvaxValues() {
  return { vaultAddress: "0x9ab2De34A33fB459b538c43f251eB825645e8595" }
}

async function getValues() {
  if (network === "avax") {
    return await getAvaxValues()
  } else if (network === "arbitrumTestnet") {
    return await getArbTestnetValues()
  } else {
    return await getArbValues()
  }
}

async function main() {
  const { vaultAddress, gasLimit } = await getValues()
  const gov = { address: "0xC86aabf86Ac158A1B8814B1a68BB5177f75d9Cb0" }
  const shortsTracker = await deployContract("ShortsTracker", [vaultAddress], "ShortsTracker", { gasLimit })
  await sendTxn(shortsTracker.setGov(gov.address), "shortsTracker.setGov")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
