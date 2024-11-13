const { deployContract, contractAt , sendTxn, writeTmpAddresses, callWithRetries } = require("../shared/helpers")
const { expandDecimals } = require("../../test/shared/utilities")
const { toUsd } = require("../../test/shared/units")

const network = (process.env.HARDHAT_NETWORK || 'mainnet');
const tokens = require('./tokens')[network];

async function main() {
  const {
    nativeToken
  } = tokens

  const vault = await contractAt("Vault", "0x46198Cf18E114B76C84199736cd0dFF703D532A9")
  const usdg = await contractAt("USDG", "0xBC08B53ba94548194e7a643364773081A923EA0B")
  const glp = await contractAt("GLP", "0x2b8757c8B6BD5D614cbF6c585B8d0e736a1AB77b")

  const glpManager = await deployContract("GlpManager", [vault.address, usdg.address, glp.address, 15 * 60])

  await sendTxn(glpManager.setInPrivateMode(true), "glpManager.setInPrivateMode")

  await sendTxn(glp.setMinter(glpManager.address, true), "glp.setMinter")
  await sendTxn(usdg.addVault(glpManager.address), "usdg.addVault")
  await sendTxn(vault.setManager(glpManager.address, true), "vault.setManager")

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
