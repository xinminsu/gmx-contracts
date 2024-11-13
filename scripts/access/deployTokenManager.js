const { deployContract, contractAt, writeTmpAddresses, sendTxn } = require("../shared/helpers")

async function main() {
  const tokenManager = await deployContract("TokenManager", [4], "TokenManager")

  const signers = [
    "0x259E6D750506409ea074908fb19e511381227BD0", // Dovey
    "0xEEcA3bdf50676E3a3aB2b25dB3903Bcf325c6e03", // G
    "0xb22819E7fd4525FBB1bf812304Bd632d79552A5e", // Han Wen
    "0x2Bca75F5c6ac18614d555C9bf88F41e08D390bd4", // Krunal Amin
    "0xF107677589F1483ceD3Ee63630E55087A40feF52", // xhiroz
    "0x442C1069995EaEFC115280d42EB88e10A2268d97" // Bybit Security Team
  ]

  await sendTxn(tokenManager.initialize(signers), "tokenManager.initialize")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
