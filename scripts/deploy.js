const fs = require("fs");
const hre = require("hardhat");

async function main() {
  const vault = await hre.ethers.deployContract("MiniVault");
  await vault.waitForDeployment();
  const address = await vault.getAddress();
  console.log("MiniVault deployed to:", address);
  fs.writeFileSync(
    "lib/contract.json",
    JSON.stringify({ address, network: hre.network.name }, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

