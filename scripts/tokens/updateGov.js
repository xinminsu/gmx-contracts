const { getFrameSigner, deployContract, contractAt, sendTxn } = require("../shared/helpers")
const { expandDecimals } = require("../../test/shared/utilities")

const network = (process.env.HARDHAT_NETWORK || 'mainnet');

async function getArbValues() {
  const vault = await contractAt("Vault", "0x46198Cf18E114B76C84199736cd0dFF703D532A9")

  const addresses = [
    ["vault", vault.address],
    ["glpManager", "0x1a9788574b320F73C0aa0182B0d321F3c2A5DC9b"],
    ["glp", "0x2b8757c8B6BD5D614cbF6c585B8d0e736a1AB77b"],
    ["gmx", "0xce99b5ED4E52cB26E4a0978eA891e117e27093Fd"],
    ["esGmx", "0xCf9150779daB6E371fb4D39C34EeaA60766A601c"],
    ["bnGmx", "0x11744802E386FBFb6D6c1485877ce9d737C6FF40"],
    ["usdg", "0xBC08B53ba94548194e7a643364773081A923EA0B"],
    ["gmxVester", "0x199070DDfd1CFb69173aa2F7e20906F26B363004"],
    ["glpVester", "0xA75287d2f8b217273E7FCD7E86eF07D33972042E"],
  ]

  const trackers = [
    ["stakedGmxTracker", "0x908C4D94D34924765f1eDc22A1DD098397c59dD4"],
    ["bonusGmxTracker", "0x4d268a7d4C16ceB5a606c173Bd974984343fea13"],
    ["feeGmxTracker", "0xd2D1162512F927a7e282Ef43a362659E4F2a728F"],
    ["feeGlpTracker", "0x4e971a87900b931fF39d1Aad67697F49835400b6"],
    ["stakedGlpTracker", "0x1aDDD80E6039594eE970E5872D247bf0414C8903"],
  ]

  return { vault, addresses, trackers }
}

async function getAvaxValues() {
  const vault = await contractAt("Vault", "0x9ab2De34A33fB459b538c43f251eB825645e8595")

  const addresses = [
    ["vault", vault.address],
    ["glpManager", "0xe1ae4d4b06A5Fe1fc288f6B4CD72f9F8323B107F"],
    ["glp", "0x01234181085565ed162a948b6a5e88758CD7c7b8"],
    ["gmx", "0x62edc0692BD897D2295872a9FFCac5425011c661"],
    ["esGmx", "0xFf1489227BbAAC61a9209A08929E4c2a526DdD17"],
    ["bnGmx", "0x8087a341D32D445d9aC8aCc9c14F5781E04A26d2"],
    ["usdg", "0xc0253c3cC6aa5Ab407b5795a04c28fB063273894"],
    ["gmxVester", "0x472361d3cA5F49c8E633FB50385BfaD1e018b445"],
    ["glpVester", "0x62331A7Bd1dfB3A7642B7db50B5509E57CA3154A"],
  ]

  const trackers = [
    ["stakedGmxTracker", "0x2bD10f8E93B3669b6d42E74eEedC65dd1B0a1342"],
    ["bonusGmxTracker", "0x908C4D94D34924765f1eDc22A1DD098397c59dD4"],
    ["feeGmxTracker", "0x4d268a7d4C16ceB5a606c173Bd974984343fea13"],
    ["feeGlpTracker", "0xd2D1162512F927a7e282Ef43a362659E4F2a728F"],
    ["stakedGlpTracker", "0x9e295B5B976a184B14aD8cd72413aD846C299660"],
  ]

  return { vault, addresses, trackers }
}

async function getValues() {
  if (network === "arbitrum") {
    return getArbValues()
  }

  if (network === "avax") {
    return getAvaxValues()
  }
}

async function main() {
  // const signer = await getFrameSigner()

  const { vault, addresses, trackers } = await getValues()

  const distributors = []

  for (let i = 0; i < trackers.length; i++) {
    const [label, trackerAddress] = trackers[i]
    const tracker = await contractAt("RewardTracker", trackerAddress)
    distributors.push([`${label}.distributor`, await tracker.distributor()])
  }

  const priceFeed = await contractAt("VaultPriceFeed", await vault.priceFeed())
  const secondaryPriceFeed = await contractAt("FastPriceFeed", await priceFeed.secondaryPriceFeed())

  const contracts = addresses.concat(trackers).concat(distributors).concat([
    ["priceFeed", priceFeed.address],
    ["secondaryPriceFeed", secondaryPriceFeed.address]
  ])

  for (let i = 0; i < contracts.length; i++) {
    const [label, address] = contracts[i]
    const goverable = await contractAt("Governable", address)
    const timelock = await contractAt("Timelock", await goverable.gov())
    const admin = await timelock.admin()
    console.log(`${label}, ${address}:\n${timelock.address}, ${admin}\n`)
  }

  // const prevGov = await contractAt("Timelock", "0x181e9495444cc7AdCE9fBdeaE4c66D7c4eFEeaf5", signer)
  // const nextGov = { address: "0x3F3E77421E30271568eF7A0ab5c5F2667675341e" }
  // for (let i = 0; i < addresses.length; i++) {
  //   const address = addresses[i]
  //   await sendTxn(prevGov.signalSetGov(address, nextGov.address), `${i}: signalSetGov`)
  //   // await sendTxn(prevGov.setGov(address, nextGov.address), `${i}: setGov`)
  // }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
