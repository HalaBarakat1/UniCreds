import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  Contract,
  JsonRpcProvider,
  isAddress,
  verifyMessage,
} from "ethers";

import { POST } from "./route";

vi.mock("ethers", function () {
  return {
    Contract: vi.fn(),
    JsonRpcProvider: vi.fn(),
    verifyMessage: vi.fn(),
    isAddress: vi.fn(),
  };
});

const TEST_ISSUER_ADDRESS =
  "0x1111111111111111111111111111111111111111";

const TEST_NON_ISSUER_ADDRESS =
  "0x2222222222222222222222222222222222222222";

const TEST_CONTRACT_ADDRESS =
  "0x3333333333333333333333333333333333333333";

const TEST_ROLE =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const TEST_CID =
  "QmTestCredentialCID123456789";

const mockedVerifyMessage =
  vi.mocked(verifyMessage);

const mockedIsAddress =
  vi.mocked(isAddress);

const MockedContract =
  vi.mocked(Contract);

const MockedJsonRpcProvider =
  vi.mocked(JsonRpcProvider);

function createPdfFile(
  name: string = "certificate.pdf",
  size: number = 100,
): File {
  const content =
    "%PDF-1.7\n" +
    "1 0 obj\n" +
    "<< /Type /Catalog >>\n" +
    "endobj\n";

  const padding =
    "x".repeat(
      Math.max(
        0,
        size - content.length,
      ),
    );

  return new File(
    [content + padding],
    name,
    {
      type: "application/pdf",
    },
  );
}

function createNonPdfFile(): File {
  return new File(
    ["This is not a PDF."],
    "certificate.txt",
    {
      type: "text/plain",
    },
  );
}

function createFakePdfFile(): File {
  return new File(
    ["NOT-A-REAL-PDF"],
    "certificate.pdf",
    {
      type: "application/pdf",
    },
  );
}

function createFormRequest(
  options: {
    address?: string;
    timestamp?: number;
    signature?: string;
    file?: File | null;
    studentId?: string;
  } = {},
): Request {
  const form =
    new FormData();

  form.append(
    "file",
    options.file ??
      createPdfFile(),
  );

  form.append(
    "studentId",
    options.studentId ??
      "STU-001",
  );

  form.append(
    "address",
    options.address ??
      TEST_ISSUER_ADDRESS,
  );

  form.append(
    "timestamp",
    String(
      options.timestamp ??
        Date.now(),
    ),
  );

  form.append(
    "signature",
    options.signature ??
      "test-signature",
  );

  return new Request(
    "http://localhost/api/pinata",
    {
      method: "POST",
      body: form,
    },
  );
}

function setupAuthorizedIssuer(): void {
  mockedIsAddress.mockReturnValue(
    true,
  );

  mockedVerifyMessage.mockReturnValue(
    TEST_ISSUER_ADDRESS,
  );

  const hasRole =
    vi.fn().mockResolvedValue(
      true,
    );

  const issuerRole =
    vi.fn().mockResolvedValue(
      TEST_ROLE,
    );

  MockedContract.mockImplementation(
    function () {
      return {
        ISSUER_ROLE:
          issuerRole,
        hasRole,
      } as unknown as InstanceType<
        typeof Contract
      >;
    },
  );

  MockedJsonRpcProvider.mockImplementation(
    function () {
      return {} as JsonRpcProvider;
    },
  );
}

function setupNonAuthorizedIssuer(): void {
  mockedIsAddress.mockReturnValue(
    true,
  );

  mockedVerifyMessage.mockReturnValue(
    TEST_NON_ISSUER_ADDRESS,
  );

  const hasRole =
    vi.fn().mockResolvedValue(
      false,
    );

  const issuerRole =
    vi.fn().mockResolvedValue(
      TEST_ROLE,
    );

  MockedContract.mockImplementation(
    function () {
      return {
        ISSUER_ROLE:
          issuerRole,
        hasRole,
      } as unknown as InstanceType<
        typeof Contract
      >;
    },
  );

  MockedJsonRpcProvider.mockImplementation(
    function () {
      return {} as JsonRpcProvider;
    },
  );
}

function setupSuccessfulPinataResponse(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          IpfsHash:
            TEST_CID,
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
}

describe(
  "POST /api/pinata",
  function () {
    beforeEach(
      function () {
        vi.clearAllMocks();

        mockedIsAddress.mockReturnValue(
          true,
        );

        process.env.PINATA_JWT =
          "test-pinata-jwt";

        process.env.NEXT_PUBLIC_RPC_URL =
          "https://example-rpc.test";

        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS =
          TEST_CONTRACT_ADDRESS;

        vi.stubGlobal(
          "fetch",
          vi.fn(),
        );
      },
    );

    it(
      "returns 500 when PINATA_JWT is missing",
      async function () {
        delete process.env.PINATA_JWT;

        const request =
          createFormRequest();

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(500);

        expect(
          data.error,
        ).toBe(
          "PINATA_JWT is missing on the server.",
        );
      },
    );

    it(
      "rejects a request when authentication data is missing",
      async function () {
        setupAuthorizedIssuer();

        const form =
          new FormData();

        form.append(
          "file",
          createPdfFile(),
        );

        form.append(
          "studentId",
          "STU-001",
        );

        const request =
          new Request(
            "http://localhost/api/pinata",
            {
              method: "POST",
              body: form,
            },
          );

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(401);

        expect(
          data.error,
        ).toBe(
          "Authentication data is missing.",
        );
      },
    );

    it(
      "rejects an invalid wallet address",
      async function () {
        setupAuthorizedIssuer();

        mockedIsAddress.mockReturnValue(
          false,
        );

        const request =
          createFormRequest({
            address:
              "not-a-wallet-address",
          });

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(401);

        expect(
          data.error,
        ).toBe(
          "Invalid wallet address.",
        );

        expect(
          mockedVerifyMessage,
        ).not.toHaveBeenCalled();

        expect(
          MockedContract,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "rejects an expired authentication request",
      async function () {
        setupAuthorizedIssuer();

        const expiredTimestamp =
          Date.now() -
          6 * 60 * 1000;

        const request =
          createFormRequest({
            timestamp:
              expiredTimestamp,
          });

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(401);

        expect(
          data.error,
        ).toBe(
          "Authentication request expired.",
        );
      },
    );

    it(
      "rejects a timestamp that is too far in the future",
      async function () {
        setupAuthorizedIssuer();

        const futureTimestamp =
          Date.now() +
          60 * 1000;

        const request =
          createFormRequest({
            timestamp:
              futureTimestamp,
          });

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(401);

        expect(
          data.error,
        ).toBe(
          "Authentication request expired.",
        );
      },
    );

    it(
      "rejects an invalid signature",
      async function () {
        setupAuthorizedIssuer();

        mockedVerifyMessage.mockImplementation(
          function () {
            throw new Error(
              "Invalid signature",
            );
          },
        );

        const request =
          createFormRequest();

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(401);

        expect(
          data.error,
        ).toBe(
          "Invalid wallet signature.",
        );

        expect(
          MockedContract,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "rejects when the recovered wallet does not match the supplied address",
      async function () {
        setupAuthorizedIssuer();

        mockedVerifyMessage.mockReturnValue(
          TEST_NON_ISSUER_ADDRESS,
        );

        const request =
          createFormRequest({
            address:
              TEST_ISSUER_ADDRESS,
          });

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(401);

        expect(
          data.error,
        ).toBe(
          "Wallet authentication failed.",
        );

        expect(
          MockedContract,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "rejects a wallet that does not have ISSUER_ROLE",
      async function () {
        setupNonAuthorizedIssuer();

        const request =
          createFormRequest({
            address:
              TEST_NON_ISSUER_ADDRESS,
          });

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(403);

        expect(
          data.error,
        ).toBe(
          "This wallet is not authorized to upload academic credentials.",
        );
      },
    );

    it(
      "returns 503 when blockchain authorization cannot be verified",
      async function () {
        mockedIsAddress.mockReturnValue(
          true,
        );

        mockedVerifyMessage.mockReturnValue(
          TEST_ISSUER_ADDRESS,
        );

        MockedJsonRpcProvider.mockImplementation(
          function () {
            return {} as JsonRpcProvider;
          },
        );

        MockedContract.mockImplementation(
          function () {
            return {
              ISSUER_ROLE:
                vi.fn().mockRejectedValue(
                  new Error(
                    "RPC unavailable",
                  ),
                ),
              hasRole:
                vi.fn().mockResolvedValue(
                  true,
                ),
            } as unknown as InstanceType<
              typeof Contract
            >;
          },
        );

        const request =
          createFormRequest();

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(503);

        expect(
          data.error,
        ).toBe(
          "Unable to verify issuer authorization.",
        );
      },
    );

    it(
      "rejects a request without a file",
      async function () {
        setupAuthorizedIssuer();

        const form =
          new FormData();

        form.append(
          "studentId",
          "STU-001",
        );

        form.append(
          "address",
          TEST_ISSUER_ADDRESS,
        );

        form.append(
          "timestamp",
          String(Date.now()),
        );

        form.append(
          "signature",
          "test-signature",
        );

        const request =
          new Request(
            "http://localhost/api/pinata",
            {
              method: "POST",
              body: form,
            },
          );

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(400);

        expect(
          data.error,
        ).toBe(
          "A PDF file is required.",
        );
      },
    );

    it(
      "rejects a non-PDF file",
      async function () {
        setupAuthorizedIssuer();

        const request =
          createFormRequest({
            file:
              createNonPdfFile(),
          });

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(415);

        expect(
          data.error,
        ).toBe(
          "Only PDF files are allowed.",
        );
      },
    );

    it(
      "rejects a file with a PDF extension but invalid PDF content",
      async function () {
        setupAuthorizedIssuer();

        const request =
          createFormRequest({
            file:
              createFakePdfFile(),
          });

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(415);

        expect(
          data.error,
        ).toBe(
          "The uploaded file is not a valid PDF.",
        );
      },
    );

    it(
      "rejects an empty file",
      async function () {
        setupAuthorizedIssuer();

        const emptyFile =
          new File(
            [],
            "empty.pdf",
            {
              type:
                "application/pdf",
            },
          );

        const request =
          createFormRequest({
            file:
              emptyFile,
          });

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(400);

        expect(
          data.error,
        ).toBe(
          "The uploaded file is empty.",
        );
      },
    );

    it(
      "rejects a PDF larger than 5 MB",
      async function () {
        setupAuthorizedIssuer();

        const largeFile =
          new File(
            [
              "%PDF-1.7\n",
              new Uint8Array(
                5 * 1024 * 1024,
              ),
            ],
            "large.pdf",
            {
              type:
                "application/pdf",
            },
          );

        const request =
          createFormRequest({
            file:
              largeFile,
          });

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(413);

        expect(
          data.error,
        ).toBe(
          "The PDF file must not exceed 5 MB.",
        );
      },
    );

    it(
      "rejects an empty student ID",
      async function () {
        setupAuthorizedIssuer();

        const request =
          createFormRequest({
            studentId:
              "   ",
          });

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(400);

        expect(
          data.error,
        ).toBe(
          "Student ID is required.",
        );
      },
    );

    it(
      "uploads a valid PDF successfully",
      async function () {
        setupAuthorizedIssuer();

        setupSuccessfulPinataResponse();

        const request =
          createFormRequest();

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(200);

        expect(
          data,
        ).toEqual({
          cid:
            TEST_CID,
          gatewayUrl:
            `https://gateway.pinata.cloud/ipfs/${TEST_CID}`,
        });

        expect(
          global.fetch,
        ).toHaveBeenCalledTimes(1);

        const calls =
          vi.mocked(
            global.fetch,
          ).mock.calls;

        const firstCall =
          calls[0];

        const url =
          firstCall[0];

        const options =
          firstCall[1] as RequestInit;

        expect(url).toBe(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
        );

        expect(
          options.method,
        ).toBe("POST");

        const headers =
          options.headers as Record<
            string,
            string
          >;

        expect(
          headers.Authorization,
        ).toBe(
          "Bearer test-pinata-jwt",
        );

        expect(
          options.body,
        ).toBeInstanceOf(
          FormData,
        );
      },
    );

    it(
      "returns 502 when Pinata upload fails",
      async function () {
        setupAuthorizedIssuer();

        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValue(
            new Response(
              "Pinata service unavailable",
              {
                status: 500,
              },
            ),
          ),
        );

        const request =
          createFormRequest();

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(502);

        expect(
          data.error,
        ).toBe(
          "Pinata service unavailable",
        );
      },
    );

    it(
      "returns 502 when Pinata does not return a CID",
      async function () {
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

        const response =
          await POST(request);

        const data =
          await response.json();

        expect(
          response.status,
        ).toBe(502);

        expect(
          data.error,
        ).toBe(
          "Pinata returned an invalid response.",
        );
      },
    );
  },
);
