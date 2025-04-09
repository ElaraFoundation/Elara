const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment of BioProofConsent contract...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${hre.ethers.utils.formatEther(balance)} ETH`);

  // Deploy the contract
  const BioProofConsent = await hre.ethers.getContractFactory("BioProofConsent");
  const bioProofConsent = await BioProofConsent.deploy();
  
  console.log("Deploying...");
  await bioProofConsent.deployed();
  
  console.log(`BioProofConsent deployed to: ${bioProofConsent.address}`);

  // Get contract's network info
  const networkName = hre.network.name;
  const chainId = await deployer.getChainId();
  
  console.log(`Network: ${networkName}`);
  console.log(`Chain ID: ${chainId}`);

  // Save deployment info
  saveDeploymentInfo(bioProofConsent, networkName, chainId);
  
  // Verify contract on Etherscan if not on a local network
  if (networkName !== "hardhat" && networkName !== "localhost") {
    console.log("Waiting for block confirmations to verify contract...");
    await bioProofConsent.deployTransaction.wait(5); // Wait for 5 confirmations
    
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: bioProofConsent.address,
        constructorArguments: []
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.error("Error verifying contract:", error);
    }
  }

  console.log("Deployment completed successfully");
}

/**
 * Save the deployment information to files
 * 
 * @param {Contract} contract The deployed contract
 * @param {string} networkName The name of the network
 * @param {number} chainId The chain ID
 */
function saveDeploymentInfo(contract, networkName, chainId) {
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // Create network directory if it doesn't exist
  const networkDir = path.join(deploymentsDir, networkName);
  if (!fs.existsSync(networkDir)) {
    fs.mkdirSync(networkDir);
  }

  // Write contract addresses
  const addressesPath = path.join(networkDir, 'addresses.json');
  const addresses = {
    BioProofConsent: contract.address
  };
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log(`Contract addresses saved to: ${addressesPath}`);

  // Save contract ABIs
  const artifactsDir = path.join(__dirname, '../artifacts/contracts');
  const contractArtifact = JSON.parse(
    fs.readFileSync(
      path.join(artifactsDir, 'BioProofConsent.sol/BioProofConsent.json'),
      'utf8'
    )
  );

  const abisDir = path.join(networkDir, 'abis');
  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir);
  }

  const abiPath = path.join(abisDir, 'BioProofConsent.json');
  fs.writeFileSync(abiPath, JSON.stringify(contractArtifact.abi, null, 2));
  console.log(`Contract ABI saved to: ${abiPath}`);

  // Copy ABI to frontend and backend
  try {
    // Copy to frontend
    const frontendDir = path.join(__dirname, '../../frontend/src/contracts');
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }
    
    const frontendPath = path.join(frontendDir, 'BioProofConsent.json');
    fs.writeFileSync(
      frontendPath,
      JSON.stringify({
        abi: contractArtifact.abi,
        address: contract.address,
        network: networkName,
        chainId: chainId
      }, null, 2)
    );
    console.log(`Contract info copied to frontend: ${frontendPath}`);

    // Copy to backend
    const backendDir = path.join(__dirname, '../../backend/contracts');
    if (!fs.existsSync(backendDir)) {
      fs.mkdirSync(backendDir, { recursive: true });
    }
    
    const backendPath = path.join(backendDir, 'BioProofConsent.json');
    fs.writeFileSync(
      backendPath,
      JSON.stringify({
        abi: contractArtifact.abi,
        address: contract.address,
        network: networkName,
        chainId: chainId
      }, null, 2)
    );
    console.log(`Contract info copied to backend: ${backendPath}`);
  } catch (error) {
    console.warn("Warning: Unable to copy contract info to frontend/backend", error);
  }

  // Save deployment summary
  const deploymentInfoPath = path.join(networkDir, 'deployment-info.json');
  const deploymentInfo = {
    contract: 'BioProofConsent',
    address: contract.address,
    network: networkName,
    chainId: chainId,
    timestamp: new Date().toISOString(),
    txHash: contract.deployTransaction.hash
  };
  fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment info saved to: ${deploymentInfoPath}`);
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });