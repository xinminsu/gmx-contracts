const { deployContract } = require("../shared/helpers")

async function main() {
  await deployContract("MintableBaseToken", ["Bonus GMX", "bnGMX", 0]);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })