import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { Contract, JsonRpcProvider, verifyMessage } from "ethers";

vi.mock("ethers", () => ({
  Contract: vi.fn(),
  JsonRpcProvider: vi.fn(),
  verifyMessage: vi.fn(),
}));

const TEST_ISSUER_ADDRESS =
  "0x1111111111111111111111111111111111111111";

const TEST_NON_ISSUER_ADDRESS =
  "0x2222222222222222222222222222222222222222";

const TEST_ROLE =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const TEST_CID = "QmTestCredentialCID123456789";

const mockedVerifyMessage = vi.mocked(verifyMessage);
const MockedContract = vi.mocked(Contract);
const MockedJsonRpcProvider = vi.mocked(JsonRpcProvider);

function createValidPdfFile(
  name = "certificate.pdf",
): File {
  const pdfContent =
    "%PDF-1.4\n" +
    "1 0 obj\n" +
    "<< /Type /Catalog >>\n" +
    "endobj\n" +
    "%%EOF";

  return new File(
    [pdfContent],
    name,
    {
      type: "application/pdf",
    },
  );
}

function createFormRequest(options?: {
  file?: File;
  address?: string;
  timestamp?: number;
  signature?: string;
  studentId?: string;
}): Request {
  const formData = new FormData();

  formData.append(
    "file",
    options?.file ?? createValidPdfFile(),
  );

  formData.append(
    "studentId",
    options?.studentId ?? "STU-001",
  );

  formData.append(
    "address",
    options?.address ?? TEST_ISSUER_ADDRESS,
  );

  formData.append(
    "timestamp",
    String(
      options?.timestamp ?? Date.now(),
    ),
  );

  formData.append(
    "signature",
    options?.signature ?? "valid-signature",
  );

  return new Request(
    "http://localhost/api/pinata",
    {
      method: "POST",
      body: formData,
    },
  );
}

function setupAuthorizedIssuer() {
  MockedJsonRpcProvider.mockImplementation(
    vi.fn() as never,
  );

  MockedContract.mockImplementation(
    vi.fn(
      () =>
        ({
          ISSUER_ROLE: vi
            .fn()
            .mockResolvedValue(TEST_ROLE),

          hasRole: vi
            .fn()
            .mockResolvedValue(true),
        }) as never,
    ) as never,
  );

  mockedVerifyMessage.mockReturnValue(
    TEST_ISSUER_ADDRESS,
  );
}

function setupNonAuthorizedIssuer() {
  MockedJsonRpcProvider.mockImplementation(
    vi.fn() as never,
  );

  MockedContract.mockImplementation(
    vi.fn(
      () =>
        ({
          ISSUER_ROLE: vi
            .fn()
            .mockResolvedValue(TEST_ROLE),

          hasRole: vi
            .fn()
            .mockResolvedValue(false),
        }) as never,
    ) as never,
  );

  mockedVerifyMessage.mockReturnValue(
    TEST_NON_ISSUER_ADDRESS,
  );
}

describe("POST /api/pinata", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.PINATA_JWT =
      "test-pinata-jwt";

    process.env.NEXT_PUBLIC_RPC_URL =
      "https://example-rpc.test";

    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS =
      "0x3333333333333333333333333333333333333333";

    vi.stubGlobal(
      "fetch",
      vi.fn(),
    );
  });

  it("rejects a request when authentication data is missing", async () => {
    const formData = new FormData();

    formData.append(
      "file",
      createValidPdfFile(),
    );

    formData.append(
      "studentId",
      "STU-001",
    );

    const request = new Request(
      "http://localhost/api/pinata",
      {
        method: "POST",
        body: formData,
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe(
      "Authentication data is missing.",
    );
  });

  it("rejects an expired authentication request", async () => {
    setupAuthorizedIssuer();

    const expiredTimestamp =
      Date.now() - 6 * 60 * 1000;

    const request =
      createFormRequest({
        timestamp: expiredTimestamp,
      });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe(
      "Authentication request expired.",
    );

    expect(mockedVerifyMessage).not.toHaveBeenCalled();
  });

  it("rejects a future authentication timestamp outside the allowed clock skew", async () => {
    setupAuthorizedIssuer();

    const futureTimestamp =
      Date.now() + 31 * 1000;

    const request =
      createFormRequest({
        timestamp: futureTimestamp,
      });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe(
      "Authentication request expired.",
    );

    expect(mockedVerifyMessage).not.toHaveBeenCalled();
  });

  it("rejects an invalid wallet signature", async () => {
    setupAuthorizedIssuer();

    mockedVerifyMessage.mockImplementation(
      () => {
        throw new Error(
          "Invalid signature",
        );
      },
    );

    const request =
      createFormRequest({
        signature: "invalid-signature",
      });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe(
      "Invalid wallet signature.",
    );
  });

  it("rejects a signature that does not belong to the claimed wallet address", async () => {
    setupAuthorizedIssuer();

    mockedVerifyMessage.mockReturnValue(
      TEST_NON_ISSUER_ADDRESS,
    );

    const request =
      createFormRequest({
        address: TEST_ISSUER_ADDRESS,
      });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe(
      "Wallet authentication failed.",
    );
  });

  it("rejects a wallet that does not have ISSUER_ROLE", async () => {
    setupNonAuthorizedIssuer();

    const request =
      createFormRequest({
        address: TEST_NON_ISSUER_ADDRESS,
      });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe(
      "This wallet is not authorized to upload academic credentials.",
    );

    expect(MockedContract).toHaveBeenCalled();
  });

  it("rejects a non-PDF file", async () => {
    setupAuthorizedIssuer();

    const nonPdfFile = new File(
      ["this is not a pdf"],
      "certificate.txt",
      {
        type: "text/plain",
      },
    );

    const request =
      createFormRequest({
        file: nonPdfFile,
      });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(415);
    expect(data.error).toBe(
      "Only PDF files are allowed.",
    );
  });

  it("rejects a file with a PDF extension but invalid PDF content", async () => {
    setupAuthorizedIssuer();

    const fakePdf = new File(
      ["this is not really a PDF"],
      "certificate.pdf",
      {
        type: "application/pdf",
      },
    );

    const request =
      createFormRequest({
        file: fakePdf,
      });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(415);
    expect(data.error).toBe(
      "The uploaded file is not a valid PDF.",
    );
  });

  it("rejects an empty file", async () => {
    setupAuthorizedIssuer();

    const emptyFile = new File(
      [],
      "empty.pdf",
      {
        type: "application/pdf",
      },
    );

    const request =
      createFormRequest({
        file: emptyFile,
      });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "The uploaded file is empty.",
    );
  });

  it("rejects a file larger than 5 MB", async () => {
    setupAuthorizedIssuer();

    const header = "%PDF-";
    const largeContent =
      new Uint8Array(
        5 * 1024 * 1024 + 1,
      );

    largeContent.set(
      new TextEncoder().encode(header),
      0,
    );

    const largeFile = new File(
      [largeContent],
      "large-certificate.pdf",
      {
        type: "application/pdf",
      },
    );

    const request =
      createFormRequest({
        file: largeFile,
      });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(413);
    expect(data.error).toBe(
      "The PDF file must not exceed 5 MB.",
    );
  });

  it("rejects a request with an empty student ID", async () => {
    setupAuthorizedIssuer();

    const request =
      createFormRequest({
        studentId: "   ",
      });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Student ID is required.",
    );
  });

  it("returns 503 when issuer authorization cannot be verified", async () => {
    mockedVerifyMessage.mockReturnValue(
      TEST_ISSUER_ADDRESS,
    );

    MockedJsonRpcProvider.mockImplementation(
      vi.fn() as never,
    );

    MockedContract.mockImplementation(
      vi.fn(
        () => {
          throw new Error(
            "RPC unavailable",
          );
        },
      ) as never,
    );

    const request =
      createFormRequest();

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe(
      "Unable to verify issuer authorization.",
    );
  });

  it("uploads a valid PDF for an authenticated and authorized issuer", async () => {
    setupAuthorizedIssuer();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            IpfsHash: TEST_CID,
          }),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          },
        ),
      ),
    );

    const request =
      createFormRequest({
        studentId: "STU-123",
      });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    expect(data).toEqual({
      cid: TEST_CID,
      gatewayUrl:
        `https://gateway.pinata.cloud/ipfs/${TEST_CID}`,
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    const fetchMock =
      vi.mocked(fetch);

    const [url, options] =
      fetchMock.mock.calls[0];

    expect(url).toBe(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
    );

    expect(options).toBeDefined();

    expect(
      (options as RequestInit).method,
    ).toBe("POST");

    const headers =
      (options as RequestInit).headers as Record<
        string,
        string
      >;

    expect(
      headers.Authorization,
    ).toBe(
      "Bearer test-pinata-jwt",
    );

    expect(
      (options as RequestInit).body,
    ).toBeInstanceOf(FormData);
  });

  it("returns 502 when Pinata rejects the upload", async () => {
    setupAuthorizedIssuer();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          "Pinata upload failed",
          {
            status: 500,
          },
        ),
      ),
    );

    const request =
      createFormRequest();

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe(
      "Pinata upload failed",
    );
  });

  it("returns 502 when Pinata returns success without an IPFS CID", async () => {
    setupAuthorizedIssuer();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({}),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          },
        ),
      ),
    );

    const request =
      createFormRequest();

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe(
      "Pinata returned an invalid response.",
    );
  });
});
