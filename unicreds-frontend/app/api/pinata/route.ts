import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const jwt = process.env.PINATA_JWT;

  if (!jwt) {
    return NextResponse.json(
      { error: "PINATA_JWT is missing on the server." },
      { status: 500 },
    );
  }

  const incoming = await request.formData();
  const file = incoming.get("file");
  const studentId = String(incoming.get("studentId") ?? "student-certificate");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "A PDF file is required." },
      { status: 400 },
    );
  }

  const payload = new FormData();
  payload.append("file", file, file.name);
  payload.append(
    "pinataMetadata",
    JSON.stringify({
      name: `${studentId}-${file.name}`,
      keyvalues: { studentId },
    }),
  );

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: payload,
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: errorText || "Pinata upload failed." },
      { status: 502 },
    );
  }

  const data = (await response.json()) as { IpfsHash: string };

  return NextResponse.json({
    cid: data.IpfsHash,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
  });
}
