import { ethers } from "hardhat";

async function main() {
  const ITERATIONS = 100;

  const [admin, issuer, student] = await ethers.getSigners();
  const University = await ethers.getContractFactory("University");
  const university = await University.deploy();
  await university.waitForDeployment();

  await university.connect(admin).registerUniversity(
    issuer.address,
    "Load Test University",
    "Damascus"
  );

  const gasUsed: bigint[] = [];
  const start = Date.now();

  for (let i = 0; i < ITERATIONS; i++) {
    const counter = await university.certificateCounter();
    const certHash = await university.generateCertificateHash(
      issuer.address,
      student.address,
      `STU-${i}`,
      "Computer Engineering",
      "90",
      `cidPlaceholder${i}`,
      counter
    );

    const tx = await university
      .connect(issuer)
      .issueCertificate(
        certHash,
        student.address,
        `STU-${i}`,
        "Computer Engineering",
        "90",
        `cidPlaceholder${i}`
      );
    const receipt = await tx.wait();
    if (receipt) gasUsed.push(receipt.gasUsed);
  }

  const totalMs = Date.now() - start;
  const total = gasUsed.reduce((a, b) => a + b, 0n);
  const avg = total / BigInt(gasUsed.length);
  const min = gasUsed.reduce((a, b) => (b < a ? b : a));
  const max = gasUsed.reduce((a, b) => (b > a ? b : a));

  console.log(`Certificates issued: ${ITERATIONS}`);
  console.log(`Total wall time: ${totalMs} ms (${(totalMs / ITERATIONS).toFixed(2)} ms/tx avg)`);
  console.log(`Gas per issueCertificate -> min: ${min}, max: ${max}, avg: ${avg}`);
  console.log(`Total gas consumed: ${total}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});