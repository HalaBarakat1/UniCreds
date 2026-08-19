import { ethers } from "ethers";

export interface UploadAuth {
  address: string;
  timestamp: number;
  signature: string;
}

export async function createUploadAuth(
  signer: ethers.Signer,
): Promise<UploadAuth> {
  const address = await signer.getAddress();

  const timestamp = Date.now();

  const message =
    `UniCreds IPFS Upload Authentication\n` +
    `Address: ${address}\n` +
    `Timestamp: ${timestamp}`;

  const signature = await signer.signMessage(message);

  return {
    address,
    timestamp,
    signature,
  };
}
