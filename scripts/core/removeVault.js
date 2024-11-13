const { deployContract, contractAt , sendTxn, writeTmpAddresses, callWithRetries } = require("../shared/helpers")
const { expandDecimals } = require("../../test/shared/utilities")
const { toUsd } = require("../../test/shared/units")

const network = (process.env.HARDHAT_NETWORK || 'mainnet');
const tokens = require('./tokens')[network];

async function main() {
  const usdg = await contractAt("USDG", "0xBC08B53ba94548194e7a643364773081A923EA0B")
  const vault = await contractAt("Vault", "0x46198Cf18E114B76C84199736cd0dFF703D532A9")

  await sendTxn(usdg.removeVault(vault.address), "usdg.removeVault")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
