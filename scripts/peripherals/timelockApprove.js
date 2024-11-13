const { contractAt, sendTxn, sleep } = require("../shared/helpers")
const { signExternally } = require("../shared/signer")
const { expandDecimals } = require("../../test/shared/utilities")

async function approveTokens({ network }) {
  const timelock = await contractAt("Timelock", "0xa252b87040E4b97AFb617962e6b7E90cB508A45F")

  const method = process.env.METHOD
  if (!["signalApprove", "approve"].includes(method)) {
    throw new Error(`Invalid method ${method}`)
  }

  const token = "0x62edc0692BD897D2295872a9FFCac5425011c661"
  const spender = "0x04A7Df5bb513010C7F16d862C3af357cAEdA32F0"
  const amount = "1000000000000000000"

  await signExternally(await timelock.populateTransaction[method](token, spender, amount));
}

async function main() {
  await approveTokens({ network: process.env.HARDHAT_NETWORK })
}

main().catch((ex) => {
  console.error(ex);
  process.exit(1);
});
