const { contractAt , sendTxn, callWithRetries } = require("../shared/helpers")
const { expandDecimals } = require("../../test/shared/utilities")

async function main() {
  const router = await callWithRetries(contractAt, ["Router", "0x8e013B0814361278B38066fd8d8A541A273dc610"])

  await sendTxn(callWithRetries(router.addPlugin.bind(router), [
    "0x4d31c9082A1BC9f81AcC661DE1232125e59F6Dc0"
  ]), "router.addPlugin")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
