import { NextResponse } from "next/server";
import {
  Contract,
  JsonRpcProvider,
  verifyMessage,
} from "ethers";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_AUTH_AGE_MS = 5 * 60 * 1000; // 5 minutes

const UNIVERSITY_ABI = [
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function ISSUER_ROLE() view returns (bytes32)",
];

function jsonError(
  message: string,
  status: number,
) {
  return NextResponse.json(
    { error: message },
    { status },
  );
}

function isValidPdf(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

async function hasIssuerRole(
  address: string,
): Promise<boolean> {
  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL;

  const contractAddress =
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  if (!rpcUrl || !contractAddress) {
    throw new Error(
      "Blockchain configuration is missing on the server.",
    );
  }

  const provider =
    new JsonRpcProvider(rpcUrl);

  const contract = new Contract(
    contractAddress,
    UNIVERSITY_ABI,
    provider,
  );

  const issuerRole =
    (await contract.ISSUER_ROLE()) as string;

  return Boolean(
    await contract.hasRole(
      issuerRole,
      address,
    ),
  );
}

export async function POST(
  request: Request,
) {
  try {
    const jwt =
      process.env.PINATA_JWT;

    if (!jwt) {
      return jsonError(
        "PINATA_JWT is missing on the server.",
        500,
      );
    }

    const incoming =
      await request.formData();

    const file =
      incoming.get("file");

    const studentId = String(
      incoming.get("studentId") ??
        "student-certificate",
    );

    const addressValue =
      incoming.get("address");

    const timestampValue =
      incoming.get("timestamp");

    const signatureValue =
      incoming.get("signature");

    if (
      typeof addressValue !== "string" ||
      typeof timestampValue !== "string" ||
      typeof signatureValue !== "string"
    ) {
      return jsonError(
        "Authentication data is missing.",
        401,
      );
    }

    let authenticatedAddress: string;

    try {
      authenticatedAddress =
        addressValue;
    } catch {
      return jsonError(
        "Invalid wallet address.",
        401,
      );
    }

    const timestamp =
      Number(timestampValue);

    if (
      !Number.isSafeInteger(timestamp)
    ) {
      return jsonError(
        "Invalid authentication timestamp.",
        401,
      );
    }

    const age =
      Date.now() - timestamp;

    if (
      age < -30_000 ||
      age > MAX_AUTH_AGE_MS
    ) {
      return jsonError(
        "Authentication request expired.",
        401,
      );
    }

    const message =
      `UniCreds IPFS Upload Authentication\n` +
      `Address: ${authenticatedAddress}\n` +
      `Timestamp: ${timestamp}`;

    let recoveredAddress: string;

    try {
      recoveredAddress =
        verifyMessage(
          message,
          signatureValue,
        );
    } catch {
      return jsonError(
        "Invalid wallet signature.",
        401,
      );
    }

    if (
      recoveredAddress.toLowerCase() !==
      authenticatedAddress.toLowerCase()
    ) {
      return jsonError(
        "Wallet authentication failed.",
        401,
      );
    }

    let authorized = false;

    try {
      authorized =
        await hasIssuerRole(
          authenticatedAddress,
        );
    } catch (error) {
      console.error(
        "Issuer authorization check failed:",
        error,
      );

      return jsonError(
        "Unable to verify issuer authorization.",
        503,
      );
    }

    if (!authorized) {
      return jsonError(
        "This wallet is not authorized to upload academic credentials.",
        403,
      );
    }

    if (!(file instanceof File)) {
      return jsonError(
        "A PDF file is required.",
        400,
      );
    }

    if (!isValidPdf(file)) {
      return jsonError(
        "Only PDF files are allowed.",
        415,
      );
    }

    if (file.size <= 0) {
      return jsonError(
        "The uploaded file is empty.",
        400,
      );
    }

    if (
      file.size > MAX_FILE_SIZE
    ) {
      return jsonError(
        "The PDF file must not exceed 5 MB.",
        413,
      );
    }

    const header =
      await file.slice(0, 5).arrayBuffer();

    const headerBytes =
      new Uint8Array(header);

    const pdfMagic =
      "%PDF-";

    const actualHeader =
      String.fromCharCode(
        ...headerBytes,
      );

    if (
      actualHeader !== pdfMagic
    ) {
      return jsonError(
        "The uploaded file is not a valid PDF.",
        415,
      );
    }

    const safeStudentId =
      studentId
        .trim()
        .slice(0, 100);

    if (!safeStudentId) {
      return jsonError(
        "Student ID is required.",
        400,
      );
    }

    const payload =
      new FormData();

    payload.append(
      "file",
      file,
      file.name,
    );

    payload.append(
      "pinataMetadata",
      JSON.stringify({
        name: `${safeStudentId}-${file.name}`,
        keyvalues: {
          studentId: safeStudentId,
          issuer:
            authenticatedAddress,
        },
      }),
    );

    const response =
      await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${jwt}`,
          },
          body: payload,
        },
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Pinata upload failed:",
        errorText,
      );

      return jsonError(
        errorText ||
          "Pinata upload failed.",
        502,
      );
    }

    const data =
      (await response.json()) as {
        IpfsHash?: string;
      };

    if (!data.IpfsHash) {
      return jsonError(
        "Pinata returned an invalid response.",
        502,
      );
    }

    return NextResponse.json({
      cid: data.IpfsHash,
      gatewayUrl:
        `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
    });
  } catch (error) {
    console.error(
      "Unexpected IPFS upload error:",
      error,
    );

    return jsonError(
      "Unexpected server error.",
      500,
    );
  }
}
