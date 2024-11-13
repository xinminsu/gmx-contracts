const { deployContract, contractAt, sendTxn, writeTmpAddresses } = require("../shared/helpers")

const network = (process.env.HARDHAT_NETWORK || 'mainnet');
const tokens = require('../core/tokens')[network];

async function deployForArb() {
  const { nativeToken } = tokens

  // use AddressZero for the glpManager since GLP mint / burn should be done using
  // the GLP RewardRouter instead
  const glpManager = await contractAt("GlpManager", ethers.constants.AddressZero)
  const glp = await contractAt("GLP", "0x2b8757c8B6BD5D614cbF6c585B8d0e736a1AB77b")

  const gmx = await contractAt("GMX", "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a");
  const esGmx = await contractAt("EsGMX", "0xf42Ae1D54fd613C9bb14810b0588FaAa09a426cA");
  const bnGmx = await contractAt("MintableBaseToken", "0x35247165119B69A40edD5304969560D0ef486921");

  const stakedGmxTracker = await contractAt("RewardTracker", "0x908C4D94D34924765f1eDc22A1DD098397c59dD4");
  const bonusGmxTracker = await contractAt("RewardTracker", "0x4d268a7d4C16ceB5a606c173Bd974984343fea13");
  const feeGmxTracker = await contractAt("RewardTracker", "0xd2D1162512F927a7e282Ef43a362659E4F2a728F");

  const feeGlpTracker = await contractAt("RewardTracker", "0x4e971a87900b931fF39d1Aad67697F49835400b6");
  const stakedGlpTracker = await contractAt("RewardTracker", "0x1aDDD80E6039594eE970E5872D247bf0414C8903");

  const gmxVester = await contractAt("Vester", "0x199070DDfd1CFb69173aa2F7e20906F26B363004")
  const glpVester = await contractAt("Vester", "0xA75287d2f8b217273E7FCD7E86eF07D33972042E")

  const govToken = await contractAt("MintableBaseToken", "0x2A29D3a792000750807cc401806d6fd539928481")

  const rewardRouter = await deployContract("RewardRouterV2", [])
  await sendTxn(rewardRouter.initialize(
    nativeToken.address,
    gmx.address,
    esGmx.address,
    bnGmx.address,
    glp.address,
    stakedGmxTracker.address,
    bonusGmxTracker.address,
    feeGmxTracker.address,
    feeGlpTracker.address,
    stakedGlpTracker.address,
    glpManager.address,
    gmxVester.address,
    glpVester.address,
    govToken.address
  ), "rewardRouter.initialize")
}

async function deployForAvax() {
  const { nativeToken } = tokens

  // use AddressZero for the glpManager since GLP mint / burn should be done using
  // the GLP RewardRouter instead
  const glpManager = await contractAt("GlpManager", ethers.constants.AddressZero)
  const glp = await contractAt("GLP", "0x01234181085565ed162a948b6a5e88758CD7c7b8")

  const gmx = await contractAt("GMX", "0x62edc0692BD897D2295872a9FFCac5425011c661");
  const esGmx = await contractAt("EsGMX", "0xFf1489227BbAAC61a9209A08929E4c2a526DdD17");
  const bnGmx = await contractAt("MintableBaseToken", "0x8087a341D32D445d9aC8aCc9c14F5781E04A26d2");

  const stakedGmxTracker = await contractAt("RewardTracker", "0x2bD10f8E93B3669b6d42E74eEedC65dd1B0a1342");
  const bonusGmxTracker = await contractAt("RewardTracker", "0x908C4D94D34924765f1eDc22A1DD098397c59dD4");
  const feeGmxTracker = await contractAt("RewardTracker", "0x4d268a7d4C16ceB5a606c173Bd974984343fea13");

  const feeGlpTracker = await contractAt("RewardTracker", "0xd2D1162512F927a7e282Ef43a362659E4F2a728F");
  const stakedGlpTracker = await contractAt("RewardTracker", "0x9e295B5B976a184B14aD8cd72413aD846C299660");

  const gmxVester = await contractAt("Vester", "0x472361d3cA5F49c8E633FB50385BfaD1e018b445")
  const glpVester = await contractAt("Vester", "0x62331A7Bd1dfB3A7642B7db50B5509E57CA3154A")

  const govToken = await contractAt("MintableBaseToken", "0x0ff183E29f1924ad10475506D7722169010CecCb")

  const rewardRouter = await deployContract("RewardRouterV2", [])
  await sendTxn(rewardRouter.initialize(
    nativeToken.address,
    gmx.address,
    esGmx.address,
    bnGmx.address,
    glp.address,
    stakedGmxTracker.address,
    bonusGmxTracker.address,
    feeGmxTracker.address,
    feeGlpTracker.address,
    stakedGlpTracker.address,
    glpManager.address,
    gmxVester.address,
    glpVester.address,
    govToken.address
  ), "rewardRouter.initialize")
}

async function deployForLocalhost() {
  const { nativeToken } = tokens

  // use AddressZero for the glpManager since GLP mint / burn should be done using
  // the GLP RewardRouter instead
  const glpManager = await contractAt("GlpManager", ethers.constants.AddressZero)
  const glp = await contractAt("GLP", "0xa17F410E5DbcfD852B101811a51E70A787eE8AAf")

  const gmx = await contractAt("GMX", "0xb529e9d88B3C59442AEAB505De42ddf0F5C99BD0");
  const esGmx = await contractAt("EsGMX", "0xD474D210905A8ef056bD13bBC4Cd0E96127f7652");
  const bnGmx = await contractAt("MintableBaseToken", "0x4d3e8B70df45207e641ddE2D881AA18e1e2032d7");

  const stakedGmxTracker = await contractAt("RewardTracker", "0x39c72b256B64170482E9561907Feab188F63df51");
  const bonusGmxTracker = await contractAt("RewardTracker", "0xFb0A07de800F0e6e117E12767e7E4e7Bde83b969");
  const feeGmxTracker = await contractAt("RewardTracker", "0x702E41a4074B9610fcD88b7Bc7F0dbb49BECF05C");

  const feeGlpTracker = await contractAt("RewardTracker", "0xfeEcA0764f5cFf604AE5daaB33ba9467E24182dF");
  const stakedGlpTracker = await contractAt("RewardTracker", "0xd9e27Fb02493F6dE42d2CaaE3fB7008F9E2A2219");

  const gmxVester = await contractAt("Vester", "0x899018A89ccC77d4754e50E52c3090a27525c959")
  const glpVester = await contractAt("Vester", "0x8DC3e14a9534D6Fd451996b171d011B3f78Caa17")

  const govToken = await contractAt("MintableBaseToken", "0x6b025E2d1eA8A15713a0569Dd507d5215a411913")

  const rewardRouter = await deployContract("RewardRouterV2", [])
  await sendTxn(rewardRouter.initialize(
    nativeToken.address,
    gmx.address,
    esGmx.address,
    bnGmx.address,
    glp.address,
    stakedGmxTracker.address,
    bonusGmxTracker.address,
    feeGmxTracker.address,
    feeGlpTracker.address,
    stakedGlpTracker.address,
    glpManager.address,
    gmxVester.address,
    glpVester.address,
    govToken.address
  ), "rewardRouter.initialize")
}

async function main() {
  if (network === "arbitrum") {
    await deployForArb()
  }

  if (network === "avax") {
    await deployForAvax()
  }

  if (network === "localhost") {
    await deployForLocalhost()
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
