# UniCreds - Academic Certificate Documentation and Verification System based on Blockchain Technology and Decentralized Storage

UniCreds is a decentralized academic credential management system built on Ethereum.
It allows authorized universities to issue, revoke, and verify academic credentials on-chain, while students can view only the credentials linked to their own wallet address.

The system is designed to improve credential authenticity, reduce forgery, and provide transparent verification using blockchain, IPFS, and wallet-based access control.

---

## Project Overview

UniCreds consists of two main parts:

```text
project-root/
├── unicreds-contracts/              # Smart contract, deployment scripts, and tests
└── unicreds-frontend/               # Next.js frontend application
```

### Main Roles

The system supports four main interfaces:

1. **Admin Portal**
   - Register universities.
   - Suspend or reactivate universities.
   - Store and display suspension reasons.
   - Search universities by name or wallet address.
   - Filter suspended universities.

2. **University Portal**
   - Issue academic credentials.
   - Revoke credentials with a revocation reason.
   - View issued records.
   - Filter revoked credentials.
   - Suspended universities can view their records but cannot issue or revoke credentials.

3. **Student Portal**
   - Any wallet can access the student interface.
   - Each student only sees credentials linked to their own wallet.
   - Students can search their credentials.
   - Students can filter revoked credentials.
   - Students can copy credential hashes and IPFS CIDs.

4. **Verification Portal**
   - Public credential verification.
   - Does not require wallet connection.
   - Allows verification by credential hash, student address, or IPFS CID.

---

## Key Features

- Role-based access control using smart contracts.
- University registration by admin.
- University suspension and reactivation.
- Suspension reason stored and displayed.
- Credential issuance on-chain.
- Credential revocation with reason.
- Public credential verification.
- IPFS document storage using Pinata.
- Student-specific credential display.
- Search and filtering in admin, university, and student interfaces.
- Sepolia testnet support.
- Improved wallet and network error handling.

---

## Smart Contract

The main smart contract is:

```text
unicreds-contracts/contracts/University.sol
```

The contract manages:

- University registry.
- Issuer permissions.
- Credential issuance.
- Credential revocation.
- Certificate verification.
- Suspension reasons.
- Revocation reasons.

---

## Credential Hash Design

Each credential is identified by a unique cryptographic hash.

The credential hash is generated from:

```text
issuerAddress
studentAddress
studentId
major
gpa
ipfsCID
certificateCounter
```

This design prevents collisions when:

- The same student receives a corrected credential.
- A revoked credential needs to be issued again.
- Two universities issue similar credentials.
- Two credentials have the same major and GPA.
- The same credential data is issued more than once.

The hash is generated in the smart contract using:

```solidity
keccak256(
    abi.encode(
        issuerAddress,
        studentAddress,
        studentId,
        major,
        gpa,
        ipfsCID,
        certificateCounter
    )
)
```

---

## Contracts Setup

Navigate to the contracts folder:

```bash
cd unicreds-contracts
```

Install dependencies:

```bash
npm install
```

Compile the smart contract:

```bash
npx hardhat compile
```

Run tests:

```bash
npx hardhat test
```

---

## Contracts Environment Variables

Create a `.env` file inside the `unicreds-contracts` folder:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY

CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS

PINATA_JWT=YOUR_PINATA_JWT

STUDENT_ADDRESS=0xSTUDENT_WALLET_ADDRESS
STUDENT_ID=HIAST-2026-001
STUDENT_MAJOR=Computer Engineering
STUDENT_GPA=92

UNIVERSITY_ADDRESS=0xUNIVERSITY_WALLET_ADDRESS
UNIVERSITY_NAME=Example University
UNIVERSITY_LOCATION=Damascus

SUSPENSION_REASON=Administrative review
REVOCATION_REASON=Incorrect credential data
CERT_HASH=0xTHE_CREDENTIAL_HASH_TO_REVOKE
```

> Never commit your real `.env` file to GitHub.

---

## Deploying to Sepolia

From the unicreds-contracts folder:

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

If `UNIVERSITY_ADDRESS` is set in `.env` at deploy time, the deploy script will automatically register that address as an active university right after deployment. Leave it unset to skip this and register universities later from the Admin portal instead.

After deployment, copy:

- The deployed contract address.
- The deployment block number.
- The ABI from the generated artifact.

The ABI is available at:

```text
unicreds-contracts/artifacts/contracts/University.sol/University.json
```

Use only the `abi` array from that file.

---

## Useful Contracts Scripts

### Issue a Credential

```bash
npx hardhat run scripts/issueCredential.ts --network sepolia
```

### Revoke a Credential

Requires `CERT_HASH` to be set in `.env` to the hash of the credential you want to revoke.

```bash
npx hardhat run scripts/revokeCredential.ts --network sepolia
```

### Suspend or Reactivate a University

```bash
npx hardhat run scripts/toggleUniversityStatus.ts --network sepolia
```

---

## Frontend Setup

Navigate to the frontend folder:

```bash
cd unicreds-frontend
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## Frontend Environment Variables

Create a `.env.local` file inside the `unicreds-frontend` folder:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
NEXT_PUBLIC_DEPLOYMENT_BLOCK=YOUR_DEPLOYMENT_BLOCK_NUMBER
NEXT_PUBLIC_LOG_BLOCK_RANGE=4000

PINATA_JWT=YOUR_PINATA_JWT
```

> Do not commit `.env.local` to GitHub.

---

## Updating the Frontend ABI

After compiling or redeploying the smart contract, update the frontend ABI file:

```text
unicreds-frontend/lib/abi/universityAbi.ts
```

The ABI source is:

```text
unicreds-contracts/artifacts/contracts/University.sol/University.json
```

Copy only the `abi` array and place it in this format:

```ts
export const universityAbi = [
  ...
] as const;
```

---

## Sepolia Network

The application is intended to work with the Sepolia testnet.

Make sure MetaMask is connected to Sepolia when using:

- Admin Portal
- University Portal
- Student Portal

The verification portal can be used without connecting a wallet.

---

## Test ETH

You need Sepolia ETH to perform transactions such as:

- Deploying the contract.
- Registering universities.
- Issuing credentials.
- Revoking credentials.
- Suspending or reactivating universities.

You can get Sepolia test ETH from faucets such as:

- Google Cloud Sepolia Faucet
- Alchemy Sepolia Faucet
- Infura Sepolia Faucet
- Chainlink Faucet

---

## Important Notes

- Students do not need to be registered by the admin.
- Any wallet can enter the Student Portal.
- The Student Portal only displays credentials linked to the connected wallet.
- Only the admin can register, suspend, or reactivate universities.
- Only active registered universities can issue or revoke credentials.
- Suspended universities can view their records but cannot issue or revoke credentials.
- Revoked credentials remain visible but are marked as revoked.
- Revocation reasons are stored and displayed.
- Suspension reasons are stored and displayed while the university is suspended.

---

## Recommended Workflow

1. Compile the smart contract.
2. Run tests.
3. Deploy the contract to Sepolia.
4. Copy the deployed contract address.
5. Copy the deployment block number.
6. Update frontend `.env.local`.
7. Update frontend ABI.
8. Start the frontend.
9. Test all portals using MetaMask accounts.

---

## Project Status

This project is designed as a functional academic credential issuance and verification system using blockchain technology.

It supports the full lifecycle of academic credentials:

```text
University registration
→ Credential issuance
→ Student display
→ Public verification
→ Credential revocation
→ Revocation reason tracking
```

---

## Technologies Used

### Smart Contract / Contracts

- Solidity
- Hardhat
- TypeScript
- Ethers.js
- OpenZeppelin AccessControl

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Ethers.js
- MetaMask

### Storage and Network

- IPFS
- Pinata
- Ethereum Sepolia Testnet
