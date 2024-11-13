const { deployContract, contractAt, sendTxn } = require("../shared/helpers")
const { expandDecimals } = require("../../test/shared/utilities")

const PRECISION = 1000000

async function main() {
  const treasury = await contractAt("Treasury", "0xa44E7252a0C137748F523F112644042E5987FfC7")
  const gmt = await contractAt("GMT", "0xFC9d680b22a9c992fdff80ad90EB75D2ecCcF3aD")
  const busd = await contractAt("Token", "0xe9e7cea3dedca5984780bafc599bd69add087d56")
  const router = { address: "0x8e013B0814361278B38066fd8d8A541A273dc610" }
  const fund = { address: "0x58CAaCa45a213e9218C5fFd605d5B953da9b9a91" }
  const gmtPresalePrice = 4.5 * PRECISION
  const gmtListingPrice = 5 * PRECISION
  const busdSlotCap = expandDecimals(2000, 18)
  const busdHardCap = expandDecimals(900 * 1000, 18)
  const busdBasisPoints = 5000 // 50%
  const unlockTime = 1615291200 // Tuesday, 9 March 2021 12:00:00 (GMT+0)

  await sendTxn(treasury.initialize(
    [
      gmt.address,
      busd.address,
      router.address,
      fund.address
    ],
    [
      gmtPresalePrice,
      gmtListingPrice,
      busdSlotCap,
      busdHardCap,
      busdBasisPoints,
      unlockTime
    ]
  ), "treasury.initialize")

  return { treasury }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
