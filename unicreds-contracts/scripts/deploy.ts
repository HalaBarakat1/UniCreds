const hre = require("hardhat");

require("dotenv").config();

async function main() {
  console.log("Starting deployment...");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with the ADMIN account: ${deployer.address}`);

  const University = await hre.ethers.getContractFactory("University");
  const contract = await University.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`Success! University contract deployed to: ${contractAddress}`);

  const universityAddress = process.env.UNIVERSITY_ADDRESS;
  const universityName = process.env.UNIVERSITY_NAME ?? "";
  const universityLocation = process.env.UNIVERSITY_LOCATION ?? "";

  if (
    universityAddress &&
    universityAddress.toLowerCase() !== deployer.address.toLowerCase()
  ) {
    console.log(`Registering an initial university: ${universityAddress}`);
    const tx = await contract.registerUniversity(
      universityAddress,
      universityName,
      universityLocation,
    );
    await tx.wait();
    console.log(`University \"${universityName}\" registered and activated.`);
  } else {
    console.log(
      "Only Admin can add universities from the Admin portal.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
