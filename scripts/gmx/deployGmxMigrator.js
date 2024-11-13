const { deployContract, contractAt } = require("../shared/helpers")
const { bigNumberify, expandDecimals } = require("../../test/shared/utilities")

async function main() {
  const { MaxUint256 } = ethers.constants
  const precision = 1000000

  const gmxMigrator = await deployContract("GmxMigrator", [2])
  const gmtGmxIou = await deployContract("GmxIou", [gmxMigrator.address, "GMT GMX (IOU)", "GMT:GMX"])
  const xgmtGmxIou = await deployContract("GmxIou", [gmxMigrator.address, "xGMT GMX (IOU)", "xGMT:GMX"])
  const gmtUsdgGmxIou = await deployContract("GmxIou", [gmxMigrator.address, "GMT-USDG GMX (IOU)", "GMT-USDG:GMX"])
  const xgmtUsdgGmxIou = await deployContract("GmxIou", [gmxMigrator.address, "xGMT-USDG GMX (IOU)", "xGMT-USDG:GMX"])

  const gmt = { address: "0xFC9d680b22a9c992fdff80ad90EB75D2ecCcF3aD" }
  const xgmt = { address: "0xe304ff0983922787Fd84BC9170CD21bF78B16B10" }
  const gmtUsdg = { address: "0xa41e57459f09a126F358E118b693789d088eA8A0" }
  const xgmtUsdg = { address: "0x0b622208fc0691C2486A3AE6B7C875b4A174b317" }
  const usdg = { address: "0x85E76cbf4893c1fbcB34dCF1239A91CE2A4CF5a7" }

  const ammRouter = { address: "0x10ED43C718714eb63d5aA57B78B54704E256024E" }
  const gmxPrice = bigNumberify(2 * precision)

  const signers = [
    "0x259E6D750506409ea074908fb19e511381227BD0", // Dovey
    "0xb22819E7fd4525FBB1bf812304Bd632d79552A5e", // Han Wen
    "0x2Bca75F5c6ac18614d555C9bf88F41e08D390bd4" // Krunal Amin
  ]

  const gmtPrice = bigNumberify(10.97 * precision)
  const xgmtPrice = bigNumberify(90.31 * precision)
  const gmtUsdgPrice = bigNumberify(parseInt(6.68 * precision * 1.1))
  const xgmtUsdgPrice = bigNumberify(parseInt(19.27 * precision * 1.1))

  const whitelistedTokens = [gmt.address, xgmt.address, gmtUsdg.address, xgmtUsdg.address]
  const iouTokens = [gmtGmxIou.address, xgmtGmxIou.address, gmtUsdgGmxIou.address, xgmtUsdgGmxIou.address]
  const prices = [gmtPrice, xgmtPrice, gmtUsdgPrice, xgmtUsdgPrice]
  const caps = [MaxUint256, MaxUint256, expandDecimals(483129, 18), expandDecimals(150191, 18)]
  const lpTokens = [gmtUsdg.address, xgmtUsdg.address]
  const lpTokenAs = [gmt.address, xgmt.address]
  const lpTokenBs = [usdg.address, usdg.address]

  await gmxMigrator.initialize(
    ammRouter.address,
    gmxPrice,
    signers,
    whitelistedTokens,
    iouTokens,
    prices,
    caps,
    lpTokens,
    lpTokenAs,
    lpTokenBs
  )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
