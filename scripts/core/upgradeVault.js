const { deployContract, contractAt , sendTxn, writeTmpAddresses, callWithRetries } = require("../shared/helpers")
const { expandDecimals } = require("../../test/shared/utilities")
const { toUsd } = require("../../test/shared/units")
const { errors } = require("../../test/core/Vault/helpers")

const network = (process.env.HARDHAT_NETWORK || 'mainnet');
const tokens = require('./tokens')[network];

// this should only be used for development
// mainnet contracts should be controller by a timelock
async function main() {
  const wallet = { address: "0x5F799f365Fa8A2B60ac0429C48B153cA5a6f0Cf8" }

  const vault = await contractAt("Vault", "0x46198Cf18E114B76C84199736cd0dFF703D532A9")
  const { eth, btc, usdc } = tokens
  const tokenArr = [eth, btc, usdc]
  for (let i = 0; i < tokenArr.length; i++) {
    const tokenInfo = tokenArr[i]
    const token = await contractAt("Token", tokenInfo.address)
    const balance = await token.balanceOf(vault.address)
    console.log(tokenInfo.name, balance.toString())
    await sendTxn(vault.upgradeVault(wallet.address, token.address, balance), `vault.upgradeVault(${tokenInfo.name})`)
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
