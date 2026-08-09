import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

async function uploadPDFToIPFS(filePath: string): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("Pinata JWT is missing in the .env file");

  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: "application/pdf" });
  formData.append("file", blob, path.basename(filePath));

  console.log("Uploading certificate PDF to IPFS via Pinata...");

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata upload failed: ${errorText}`);
  }

  const data = (await response.json()) as { IpfsHash: string };
  console.log(`Upload successful! Content Identifier (CID): ${data.IpfsHash}`);
  return data.IpfsHash;
}

async function main() {
  const pdfPath = path.join(__dirname, "../test.pdf");
  const studentAddress = process.env.STUDENT_ADDRESS ?? "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const studentId = process.env.STUDENT_ID ?? "HIAST-2026-001";
  const major = process.env.STUDENT_MAJOR ?? "Network and Operating Systems";
  const gpa = process.env.STUDENT_GPA ?? "3.95";
  const contractAddress = process.env.CONTRACT_ADDRESS ?? "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const cid = await uploadPDFToIPFS(pdfPath);

  console.log("\nConnecting to University.sol smart contract...");
  const university = await ethers.getContractAt("University", contractAddress);

  const [issuer] = await ethers.getSigners();
  const certificateCounter = await university.certificateCounter();

  console.log("Generating cryptographic commitment hash for issuer, student data, CID, and certificate counter...");
  console.log(`Issuer Address: ${issuer.address}`);
  console.log(`Certificate Counter: ${certificateCounter}`);
  const commitmentHash = await university.generateCertificateHash(
    issuer.address,
    studentAddress,
    studentId,
    major,
    gpa,
    cid,
    certificateCounter,
  );
  console.log(`Commitment Hash: ${commitmentHash}`);

  console.log("\nSending issuance transaction to the blockchain...");
  const tx = await university.issueCertificate(
    commitmentHash,
    studentAddress,
    studentId,
    major,
    gpa,
    cid,
  );

  console.log(`Waiting for block confirmation... (Transaction Hash: ${tx.hash})`);
  const receipt = await tx.wait();

  console.log("\nSuccess! Academic credential anchored permanently on-chain.");
  console.log(`Included in Block Number: ${receipt?.blockNumber}`);
}

main().catch((error) => {
  console.error("Execution failed with error:", error);
  process.exitCode = 1;
});
