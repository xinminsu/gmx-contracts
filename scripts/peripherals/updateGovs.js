const { deployContract, contractAt } = require("../shared/helpers")
const { signExternally } = require("../shared/signer")
const { expandDecimals } = require("../../test/shared/utilities")

const network = (process.env.HARDHAT_NETWORK || 'mainnet');

// TODO: update GlpManager addresses
async function getArbValues() {
  const contracts = [
    // "0x46198Cf18E114B76C84199736cd0dFF703D532A9", // Vault
    "0x199070DDfd1CFb69173aa2F7e20906F26B363004", // GmxVester
    "0xA75287d2f8b217273E7FCD7E86eF07D33972042E", // GlpVester
    // "0x1a9788574b320F73C0aa0182B0d321F3c2A5DC9b", // GlpManager 1
    // "0x1a9788574b320F73C0aa0182B0d321F3c2A5DC9b", // GlpManager 2
    // "0x2b8757c8B6BD5D614cbF6c585B8d0e736a1AB77b", // GLP
    "0xf42Ae1D54fd613C9bb14810b0588FaAa09a426cA", // ES_GMX
    "0x35247165119B69A40edD5304969560D0ef486921", // BN_GMX
    // "0xBC08B53ba94548194e7a643364773081A923EA0B", // USDG
  ]

  const trackers = [
    "0x908C4D94D34924765f1eDc22A1DD098397c59dD4", // StakedGmxTracker
    "0x4d268a7d4C16ceB5a606c173Bd974984343fea13", // BonusGmxTracker
    "0xd2D1162512F927a7e282Ef43a362659E4F2a728F", // FeeGmxTracker
    "0x1aDDD80E6039594eE970E5872D247bf0414C8903", // StakedGlpTracker
    "0x4e971a87900b931fF39d1Aad67697F49835400b6", // FeeGlpTracker
  ]

  const nextTimelock = { address: "0x460e1A727c9CAE785314994D54bde0804582bc6e" }

  return { contracts, trackers, nextTimelock }
}

async function getAvaxValues() {
  const contracts = [
    // "0x9ab2De34A33fB459b538c43f251eB825645e8595", // Vault
    "0x472361d3cA5F49c8E633FB50385BfaD1e018b445", // GmxVester
    "0x62331A7Bd1dfB3A7642B7db50B5509E57CA3154A", // GlpVester
    // "0xe1ae4d4b06A5Fe1fc288f6B4CD72f9F8323B107F", // GlpManager 1
    // "0xD152c7F25db7F4B95b7658323c5F33d176818EE4", // GlpManager 2
    // "0x01234181085565ed162a948b6a5e88758CD7c7b8", // GLP
    "0xFf1489227BbAAC61a9209A08929E4c2a526DdD17", // ES_GMX
    "0x8087a341D32D445d9aC8aCc9c14F5781E04A26d2", // BN_GMX
    // "0xc0253c3cC6aa5Ab407b5795a04c28fB063273894", // USDG
  ]

  const trackers = [
    "0x2bD10f8E93B3669b6d42E74eEedC65dd1B0a1342", // StakedGmxTracker
    "0x908C4D94D34924765f1eDc22A1DD098397c59dD4", // BonusGmxTracker
    "0x4d268a7d4C16ceB5a606c173Bd974984343fea13", // FeeGmxTracker
    "0x9e295B5B976a184B14aD8cd72413aD846C299660", // StakedGlpTracker
    "0xd2D1162512F927a7e282Ef43a362659E4F2a728F", // FeeGlpTracker
  ]

  const nextTimelock = { address: "0xa252b87040E4b97AFb617962e6b7E90cB508A45F" }

  return { contracts, trackers, nextTimelock }
}

async function getValues() {
  if (network === "arbitrum") {
    return getArbValues()
  }

  if (network === "avax") {
    return getAvaxValues()
  }
}

async function setGov(target, nextTimelock, signer) {
    const prevTimelock = await contractAt("GmxTimelock", await target.gov(), signer)
    if (prevTimelock.address === nextTimelock.address) {
      console.info("gov already set to nextTimelock, skipping", target.address)
      return
    }

  // await signExternally(await prevTimelock.populateTransaction.signalSetGov(target.address, nextTimelock.address));
  await signExternally(await prevTimelock.populateTransaction.setGov(target.address, nextTimelock.address));
}

async function main() {
  const { contracts, trackers, nextTimelock } = await getValues()

  for (let i = 0; i < contracts.length; i++) {
    const target = await contractAt("Governable", contracts[i])
    await setGov(target, nextTimelock)
  }

  for (let i = 0; i < trackers.length; i++) {
    const rewardTracker = await contractAt("RewardTracker", trackers[i])
    // const distributor = await contractAt("RewardDistributor", await rewardTracker.distributor())

    await setGov(rewardTracker, nextTimelock)
    // await setGov(distributor, nextTimelock)
  }
}

main().catch((ex) => {
  console.error(ex);
  process.exit(1);
});
