import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const contractAddress =
    process.env.CONTRACT_ADDRESS ??
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const certHash = process.env.CERT_HASH;
  const reason = process.env.REVOCATION_REASON ?? "Incorrect student data";

  if (!certHash) {
    throw new Error("CERT_HASH is missing in the .env file.");
  }

  const university = await ethers.getContractAt("University", contractAddress);

  const tx = await university.revokeCertificate(certHash, reason);
  console.log(`Transaction sent: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`Revoked in block: ${receipt?.blockNumber}`);

  const savedReason = await university.revocationReasons(certHash);
  console.log("Saved reason:", savedReason);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
