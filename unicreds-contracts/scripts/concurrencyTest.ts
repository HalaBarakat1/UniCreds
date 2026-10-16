import { ethers, network } from "hardhat";

// Reproduces the concurrency experiment: 15 different universities issue a
// certificate to 15 different students at the same time.
//   npx hardhat run scripts/concurrencyTest.ts --network hardhat
// Run 1 submits all transactions at once (each is mined as it arrives).
// Run 2 disables automine so all 15 transactions land in the same block.
const UNIVERSITIES = 15;

async function runOnce(sameBlock: boolean) {
  const signers = await ethers.getSigners();
  const admin = signers[0];
  const universities = signers.slice(1, 1 + UNIVERSITIES);
  // Students only receive certificates and never sign, so random addresses are enough
  // (the Hardhat network provides 20 signer accounts by default).
  const students = Array.from({ length: UNIVERSITIES }, () => ethers.Wallet.createRandom());

  const University = await ethers.getContractFactory("University");
  const university = await University.deploy();
  await university.waitForDeployment();

  for (const [i, uni] of universities.entries()) {
    await (await university.connect(admin).registerUniversity(uni.address, `University ${i + 1}`, "Damascus")).wait();
  }

  if (sameBlock) await network.provider.send("evm_setAutomine", [false]);

  const start = Date.now();
  const sends = universities.map((uni, i) =>
    university
      .connect(uni)
      .issueCertificate(
        students[i].address,
        `STU-${i + 1}`,
        "Computer Engineering",
        "3.50",
        `QmConcurrencyCid${i + 1}`,
        { gasLimit: 300_000 },
      ),
  );

  const sent = await Promise.allSettled(sends);
  if (sameBlock) await network.provider.send("evm_mine", []);

  const mined = await Promise.allSettled(
    sent.map((s) => (s.status === "fulfilled" ? s.value.wait() : Promise.reject(s.reason))),
  );
  const totalMs = Date.now() - start;
  if (sameBlock) await network.provider.send("evm_setAutomine", [true]);

  const succeeded = mined.filter((m) => m.status === "fulfilled" && m.value?.status === 1).length;
  const blocks = new Set(
    mined.flatMap((m) => (m.status === "fulfilled" && m.value ? [m.value.blockNumber] : [])),
  );

  console.log(`\n=== ${sameBlock ? "Same block" : "Concurrent submission"}: ${UNIVERSITIES} different universities issuing at the same time ===`);
  console.log(`Succeeded: ${succeeded}/${UNIVERSITIES}`);
  console.log(`Failed: ${UNIVERSITIES - succeeded}/${UNIVERSITIES}`);
  console.log(`Blocks used: ${blocks.size}`);
  console.log(`Total time: ${totalMs} ms`);
  console.log(`certificateCounter: ${await university.certificateCounter()}`);
}

async function main() {
  await runOnce(false);
  await runOnce(true);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
