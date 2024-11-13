const { contractAt, sendTxn } = require("../shared/helpers")

async function main() {
  const treasury = await contractAt("Treasury", "0xD0734198D3E00384C56206f85A4927CBEa6B1895")
  const gmt = await contractAt("GMT", "0xFC9d680b22a9c992fdff80ad90EB75D2ecCcF3aD")

  // await sendTxn(treasury.addLiquidity(), "treasury.addLiquidity")
  await sendTxn(gmt.endMigration(), "gmt.endMigration")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
