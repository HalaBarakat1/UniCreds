import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("University Comprehensive Test Suite", function () {
  async function deployUniversityFixture() {
    const [admin, issuer, student, otherAccount] = await ethers.getSigners();
    const University = await ethers.getContractFactory("University");
    const university = await University.deploy();

    const ISSUER_ROLE = ethers.id("ISSUER_ROLE");
    const DEFAULT_ADMIN_ROLE =
      "0x0000000000000000000000000000000000000000000000000000000000000000";

    return {
      university,
      admin,
      issuer,
      student,
      otherAccount,
      ISSUER_ROLE,
      DEFAULT_ADMIN_ROLE,
    };
  }

  describe("1. Access Control & Registry", function () {
    it("Should assign the deployer as the Admin", async function () {
      const { university, admin, DEFAULT_ADMIN_ROLE } = await loadFixture(
        deployUniversityFixture,
      );
      expect(await university.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(true);
    });

    it("Should allow Admin to register a university and grant ISSUER_ROLE", async function () {
      const { university, admin, issuer, ISSUER_ROLE } = await loadFixture(
        deployUniversityFixture,
      );

      await expect(
        university
          .connect(admin)
          .registerUniversity(issuer.address, "Tech University", "Silicon Valley"),
      )
        .to.emit(university, "UniversityRegistered")
        .withArgs(issuer.address, "Tech University");

      expect(await university.hasRole(ISSUER_ROLE, issuer.address)).to.equal(true);
    });

    it("Should require a suspension reason and clear it on reactivation", async function () {
      const { university, admin, issuer, ISSUER_ROLE } = await loadFixture(
        deployUniversityFixture,
      );

      await university
        .connect(admin)
        .registerUniversity(issuer.address, "Tech University", "Silicon Valley");

      await expect(
        university.connect(admin).toggleUniversityStatus(issuer.address, ""),
      ).to.be.revertedWith("Suspension reason required");

      await expect(
        university
          .connect(admin)
          .toggleUniversityStatus(issuer.address, "Compliance review"),
      )
        .to.emit(university, "UniversityStatusToggled")
        .withArgs(issuer.address, false, "Compliance review");

      expect(await university.hasRole(ISSUER_ROLE, issuer.address)).to.equal(false);

      const suspendedProfile = await university.getUniversityProfile(issuer.address);
      expect(suspendedProfile[2]).to.equal(false);
      expect(suspendedProfile[4]).to.equal("Compliance review");

      await expect(
        university.connect(admin).toggleUniversityStatus(issuer.address, ""),
      )
        .to.emit(university, "UniversityStatusToggled")
        .withArgs(issuer.address, true, "");

      expect(await university.hasRole(ISSUER_ROLE, issuer.address)).to.equal(true);

      const reactivatedProfile = await university.getUniversityProfile(issuer.address);
      expect(reactivatedProfile[2]).to.equal(true);
      expect(reactivatedProfile[4]).to.equal("");
    });

    it("Should prevent unauthorized users from issuing certificates", async function () {
      const { university, otherAccount, student } = await loadFixture(
        deployUniversityFixture,
      );
      const fakeHash = ethers.id("FakeCert");

      await expect(
        university
          .connect(otherAccount)
          .issueCertificate(fakeHash, student.address, "ID", "Major", "3.0", "QmFakeCid"),
      ).to.be.revertedWithCustomError(university, "AccessControlUnauthorizedAccount");
    });
  });

  describe("2. Certificate Operations & Credential Commitment", function () {
    it("Should generate consistent hashes from issuer, student data, CID, and counter", async function () {
      const { university, issuer, student } = await loadFixture(deployUniversityFixture);

      const studentId = "ID-2026";
      const major = "Computer Engineering";
      const gpa = "3.95";
      const cid = "QmHashCid";
      const counter = 0n;

      const expectedHash = ethers.solidityPackedKeccak256(
        ["address", "address", "string", "string", "string", "string", "uint256"],
        [issuer.address, student.address, studentId, major, gpa, cid, counter],
      );

      const contractHash = await university.generateCertificateHash(
        issuer.address,
        student.address,
        studentId,
        major,
        gpa,
        cid,
        counter,
      );
      expect(contractHash).to.equal(expectedHash);
    });

    it("Should successfully issue a certificate", async function () {
      const { university, admin, issuer, student } = await loadFixture(
        deployUniversityFixture,
      );
      const cid = "QmValidCid123";

      await university
        .connect(admin)
        .registerUniversity(issuer.address, "Tech University", "Silicon Valley");
      const certHash = await university.generateCertificateHash(
        issuer.address,
        student.address,
        "ID-2026",
        "Computer Engineering",
        "3.95",
        cid,
        await university.certificateCounter(),
      );

      await expect(
        university.connect(issuer).issueCertificate(certHash, student.address, "ID-2026", "Computer Engineering", "3.95", cid),
      )
        .to.emit(university, "CertificateIssued")
        .withArgs(certHash, student.address, cid);
    });

    it("Should increment the certificate counter and allow identical data with a new counter", async function () {
      const { university, admin, issuer, student } = await loadFixture(
        deployUniversityFixture,
      );
      const cid = "QmDuplicateCid";
      const studentId = "ID-2026";
      const major = "Computer Engineering";
      const gpa = "3.95";

      await university
        .connect(admin)
        .registerUniversity(issuer.address, "Tech University", "Silicon Valley");

      const firstHash = await university.generateCertificateHash(
        issuer.address,
        student.address,
        studentId,
        major,
        gpa,
        cid,
        await university.certificateCounter(),
      );
      await university
        .connect(issuer)
        .issueCertificate(firstHash, student.address, studentId, major, gpa, cid);
      expect(await university.certificateCounter()).to.equal(1n);

      const secondHash = await university.generateCertificateHash(
        issuer.address,
        student.address,
        studentId,
        major,
        gpa,
        cid,
        await university.certificateCounter(),
      );
      expect(secondHash).to.not.equal(firstHash);
      await university
        .connect(issuer)
        .issueCertificate(secondHash, student.address, studentId, major, gpa, cid);
      expect(await university.certificateCounter()).to.equal(2n);
    });

    it("Should accurately retrieve certificate data and issuer identity", async function () {
      const { university, admin, issuer, student } = await loadFixture(
        deployUniversityFixture,
      );
      const cid = "QmVerificationCid";

      await university
        .connect(admin)
        .registerUniversity(issuer.address, "Tech University", "Silicon Valley");
      const certHash = await university.generateCertificateHash(
        issuer.address,
        student.address,
        "ID-2026",
        "Computer Engineering",
        "3.95",
        cid,
        await university.certificateCounter(),
      );
      await university.connect(issuer).issueCertificate(certHash, student.address, "ID-2026", "Computer Engineering", "3.95", cid);

      const [isValid, studentAddr, issueDate, issuerAddr, ipfsCID] =
        await university.verifyCertificate(certHash);

      expect(isValid).to.equal(true);
      expect(studentAddr).to.equal(student.address);
      expect(issuerAddr).to.equal(issuer.address);
      expect(ipfsCID).to.equal(cid);
      expect(issueDate).to.be.gt(0);
    });

    it("Should allow authorized Issuer to revoke a certificate and store its reason", async function () {
      const { university, admin, issuer, student } = await loadFixture(
        deployUniversityFixture,
      );
      const cid = "QmRevokeCid";
      const reason = "Incorrect student data";

      await university
        .connect(admin)
        .registerUniversity(issuer.address, "Tech University", "Silicon Valley");
      const certHash = await university.generateCertificateHash(
        issuer.address,
        student.address,
        "ID-2026",
        "Computer Engineering",
        "3.95",
        cid,
        await university.certificateCounter(),
      );
      await university.connect(issuer).issueCertificate(certHash, student.address, "ID-2026", "Computer Engineering", "3.95", cid);

      await expect(university.connect(issuer).revokeCertificate(certHash, reason))
        .to.emit(university, "CertificateRevoked")
        .withArgs(certHash, reason);

      const [isValid] = await university.verifyCertificate(certHash);
      expect(isValid).to.equal(false);
      expect(await university.revocationReasons(certHash)).to.equal(reason);
    });

    it("Should return an empty result when verifying a non-existent certificate", async function () {
      const { university } = await loadFixture(deployUniversityFixture);
      const nonExistentHash = ethers.id("Missing");

      const [isValid, studentAddress, issueDate, issuerAddress, ipfsCID] =
        await university.verifyCertificate(nonExistentHash);

      expect(isValid).to.equal(false);
      expect(studentAddress).to.equal(ethers.ZeroAddress);
      expect(issueDate).to.equal(0n);
      expect(issuerAddress).to.equal(ethers.ZeroAddress);
      expect(ipfsCID).to.equal("");
    });

    it("Should prevent a suspended university from issuing certificates", async function () {
      const { university, admin, issuer, student } = await loadFixture(
        deployUniversityFixture,
      );
      const certHash = ethers.id("SuspendedTest");

      await university
        .connect(admin)
        .registerUniversity(issuer.address, "Tech University", "Silicon Valley");
      await university
        .connect(admin)
        .toggleUniversityStatus(issuer.address, "Administrative suspension");

      await expect(
        university
          .connect(issuer)
          .issueCertificate(certHash, student.address, "ID-2026", "Computer Engineering", "3.95", "QmSuspendedCid"),
      ).to.be.revertedWithCustomError(university, "AccessControlUnauthorizedAccount");
    });
  });
});
