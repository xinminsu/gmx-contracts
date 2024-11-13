const { contractAt, sendTxn } = require("../shared/helpers")
const { expandDecimals } = require("../../test/shared/utilities")
const { getAccounts } = require("../../data/airdrop")

async function main() {
  const gmt = await contractAt("GMT", "0xce99b5ED4E52cB26E4a0978eA891e117e27093Fd")
  const batchSender = await contractAt("BatchSender", "0x1ec628Eb57aCe33C1A396C430D73dFB455AB5149")
  const accounts = getAccounts()

  // await sendTxn(gmt.beginMigration(), "gmt.beginMigration")
  // await sendTxn(gmt.addMsgSender(batchSender.address), "gmt.addMsgSender(batchSender)")

  // await sendTxn(gmt.approve(batchSender.address, "112000000000000000000000"), "gmt.approve")

  const addresses = []
  const amounts = []

  for (let i = 0; i < accounts.length; i++) {
    console.info("accounts[i]", i, accounts[i])
    addresses.push(accounts[i][0])
    amounts.push(ethers.utils.parseEther(accounts[i][1]))
  }

  await sendTxn(batchSender.send(gmt.address, addresses, amounts), "batchSender.send")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
