const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying CreditRegistry with:", deployer.address);

  const Registry = await hre.ethers.getContractFactory("CreditRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const address = await registry.getAddress();

  console.log("CreditRegistry deployed to:", address);

  // Export ABI next to the Solidity source for the Python backend
  const artifact = await hre.artifacts.readArtifact("CreditRegistry");
  const outDir = path.join(__dirname, "..");
  fs.writeFileSync(
    path.join(outDir, "abi.json"),
    JSON.stringify(artifact.abi, null, 2)
  );
  const backendAbi = path.join(
    __dirname,
    "..",
    "..",
    "backend",
    "app",
    "integrations",
    "abi.json"
  );
  try {
    fs.writeFileSync(backendAbi, JSON.stringify(artifact.abi, null, 2));
    console.log("Synced ABI to backend/app/integrations/abi.json");
  } catch (e) {
    console.warn("Could not sync ABI to backend:", e.message);
  }

  console.log("\nAdd to backend .env:");
  console.log(`CONTRACT_ADDRESS=${address}`);
  console.log(`PRIVATE_KEY=<deployer private key>`);
  console.log(`LOCAL_RPC=http://127.0.0.1:8545`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
