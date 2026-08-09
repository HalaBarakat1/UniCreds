import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const contractAddress =
    process.env.CONTRACT_ADDRESS ??
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const universityAddress = process.env.UNIVERSITY_ADDRESS;
  const reason = process.env.SUSPENSION_REASON ?? "";

  if (!universityAddress) {
    throw new Error("UNIVERSITY_ADDRESS is missing in the .env file.");
  }

  const university = await ethers.getContractAt("University", contractAddress);
  const [, , isActive] = await university.getUniversityProfile(universityAddress);

  if (isActive && !reason.trim()) {
    throw new Error("SUSPENSION_REASON is required when suspending a university.");
  }

  const tx = await university.toggleUniversityStatus(universityAddress, isActive ? reason : "");
  console.log(`Transaction sent: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`Status toggled in block: ${receipt?.blockNumber}`);

  const [name, location, activeNow, registrationDate, savedReason] =
    await university.getUniversityProfile(universityAddress);

  console.log({
    universityAddress,
    name,
    location,
    isActive: activeNow,
    registrationDate: registrationDate.toString(),
    suspensionReason: savedReason,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
