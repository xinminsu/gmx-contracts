const { deployContract, contractAt, sendTxn } = require("../shared/helpers")
const { signExternally } = require("../shared/signer")
const { expandDecimals } = require("../../test/shared/utilities")

const network = (process.env.HARDHAT_NETWORK || 'mainnet');

async function getArbValues() {
  const vault = await contractAt("Vault", "0x46198Cf18E114B76C84199736cd0dFF703D532A9")
  const tokenManager = { address: "0xD85bCf95F50e39106F2F28B03F092247Fbe60DeD" }
  const glpManager = { address: "0x1a9788574b320F73C0aa0182B0d321F3c2A5DC9b" }
  const prevGlpManager = { address: "0x4Cc0c66704E5BC2c18209BAdBcE29d3e559fe9Db" }
  const rewardRouter = { address: "0x50BA9F8c29d3c168EDf39afD3ef0949f93F9d210" }

  const positionRouter = { address: "0x3aF8Faa456EE61ab140A0b92f08D99E277f85514" }
  const positionManager = { address: "0xb1CE3330e2B8627d1Bc2d3dA43E6560b16543449" }
  const gmx = { address: "0xce99b5ED4E52cB26E4a0978eA891e117e27093Fd" }

  const feeHandler = { address: "0x9e54E2c95E37f332d3dC67Dd716edC1ce5EFbC69" }

  return {
    vault,
    tokenManager,
    glpManager,
    prevGlpManager,
    rewardRouter,
    positionRouter,
    positionManager,
    gmx,
    feeHandler
  }
}

async function getAvaxValues() {
  const vault = await contractAt("Vault", "0x9ab2De34A33fB459b538c43f251eB825645e8595")
  const tokenManager = { address: "0x8b25Ba1cAEAFaB8e9926fabCfB6123782e3B4BC2" }
  const glpManager = { address: "0xD152c7F25db7F4B95b7658323c5F33d176818EE4" }
  const prevGlpManager = { address: "0x11744802E386FBFb6D6c1485877ce9d737C6FF40" }
  const rewardRouter = { address: "0x0000000000000000000000000000000000000000" }

  const positionRouter = { address: "0xffF6D276Bc37c61A23f06410Dce4A400f66420f8" }
  const positionManager = { address: "0xA21B83E579f4315951bA658654c371520BDcB866" }
  const gmx = { address: "0x62edc0692BD897D2295872a9FFCac5425011c661" }

  const feeHandler = { address: "0x775CaaA2cB635a56c6C3dFb9C65B5Fa6335F79E7" }

  return {
    vault,
    tokenManager,
    glpManager,
    prevGlpManager,
    rewardRouter,
    positionRouter,
    positionManager,
    gmx,
    feeHandler
  }
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
  const admin = "0x04A7Df5bb513010C7F16d862C3af357cAEdA32F0"
  const buffer = 24 * 60 * 60
  // the GmxTimelock should have a cap of 13.25m tokens, for other tokens
  // like Multiplier Points, the supply may exceed 13.25m tokens
  const maxTokenSupply = expandDecimals(100_000_000, 18)

  const {
    vault,
    tokenManager,
    glpManager,
    prevGlpManager,
    rewardRouter,
    positionRouter,
    positionManager,
    gmx,
    feeHandler
  } = await getValues()

  const mintReceiver = tokenManager

  const timelock = await deployContract("Timelock", [
    admin, // admin
    buffer, // buffer
    tokenManager.address, // tokenManager
    mintReceiver.address, // mintReceiver
    glpManager.address, // glpManager
    prevGlpManager.address, // prevGlpManager
    rewardRouter.address, // rewardRouter
    maxTokenSupply, // maxTokenSupply
    10, // marginFeeBasisPoints 0.1%
    500 // maxMarginFeeBasisPoints 5%
  ], "Timelock")

  const deployedTimelock = await contractAt("Timelock", timelock.address)

  const multicallWriteParams = []

  multicallWriteParams.push(deployedTimelock.interface.encodeFunctionData("setShouldToggleIsLeverageEnabled", [true]));
  multicallWriteParams.push(deployedTimelock.interface.encodeFunctionData("setContractHandler", [positionRouter.address, true]));
  multicallWriteParams.push(deployedTimelock.interface.encodeFunctionData("setContractHandler", [positionManager.address, true]));
  multicallWriteParams.push(deployedTimelock.interface.encodeFunctionData("setFeeHandler", [feeHandler.address, true]));

  const handlers = [
    "0xC0557CFe9e654Bee1b6B5062Fb08436a4869d064", // coinflipcanada
    "0xEEcA3bdf50676E3a3aB2b25dB3903Bcf325c6e03", // G
    "0x975852aebb519BA42c38dF572148C8232F230a0C", // kr
    "0xF107677589F1483ceD3Ee63630E55087A40feF52" // xhiroz
  ]

  for (let i = 0; i < handlers.length; i++) {
    const handler = handlers[i]
    multicallWriteParams.push(deployedTimelock.interface.encodeFunctionData("setContractHandler", [handler, true]));
  }

  const keepers = [
    "0x439Dd79a3bD74CCf427769107f368218320bEEBb" // X
  ]

  for (let i = 0; i < keepers.length; i++) {
    const keeper = keepers[i]
    multicallWriteParams.push(deployedTimelock.interface.encodeFunctionData("setContractHandler", [keeper, true]));
  }

  multicallWriteParams.push(deployedTimelock.interface.encodeFunctionData("signalApprove", [gmx.address, admin, "1000000000000000000"]));
  await signExternally(await deployedTimelock.populateTransaction.multicall(multicallWriteParams));

  // // update gov of vault
  const vaultGov = await contractAt("Timelock", await vault.gov())

  await signExternally(await vaultGov.populateTransaction.signalSetGov(vault.address, deployedTimelock.address));
  // to revert the gov change if needed
  await signExternally(await deployedTimelock.populateTransaction.signalSetGov(vault.address, vaultGov.address));
}

main().catch((ex) => {
  console.error(ex);
  process.exit(1);
});
