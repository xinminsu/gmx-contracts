const { deployContract, sendTxn } = require("../shared/helpers")

async function main() {
  const admin = { address: "0x04A7Df5bb513010C7F16d862C3af357cAEdA32F0" }
  const token = await deployContract("SnapshotToken", ["GMX Snapshot 1", "GMX 1", 0])
  await sendTxn(token.setInPrivateTransferMode(true), "token.setInPrivateTransferMode")
  await sendTxn(token.setMinter(admin.address, true), "token.setMinter")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
