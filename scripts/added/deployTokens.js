const { deployContract } = require("../shared/helpers")

async function main() {
  await deployContract("Token", [], "ETH"),
  
  await deployContract("Token", [], "USDCE"),
  
  await deployContract("Token", [], "USDC"),
  
  await deployContract("Token", [], "LINK"),
  
  await deployContract("Token", [], "UNI"),
  
  await deployContract("Token", [], "USDT"),
  
  await deployContract("Token", [], "FRAX"),
  
  await deployContract("Token", [], "DAI"),
  
  await deployContract("Token", [], "WETH"),
  
  await deployContract("Token", [], "MIM")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })