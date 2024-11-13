const { deployContract, contractAt, writeTmpAddresses } = require("../shared/helpers")

async function main() {
  const gmx = { address: "0xce99b5ED4E52cB26E4a0978eA891e117e27093Fd" }
  const wGmx = { address: "0x590020B1005b8b25f1a2C82c5f743c540dcfa24d" }
  await deployContract("Bridge", [gmx.address, wGmx.address], "Bridge")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
