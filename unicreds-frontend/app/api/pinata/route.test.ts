import { beforeEach, describe, expect, it, vi } from "vitest";

const mockHasRole = vi.fn();
const mockIssuerRole = vi.fn();

vi.mock("ethers", () => ({
  JsonRpcProvider: vi.fn(),
  Contract: vi.fn(() => ({
    ISSUER_ROLE: mockIssuerRole,
    hasRole: mockHasRole,
  })),
  verifyMessage: vi.fn(),
}));

import { verifyMessage } from "ethers";
import { POST } from "./route";

const mockedVerifyMessage = vi.mocked(verifyMessage);

const VALID_ADDRESS =
  "0x1111111111111111111111111111111111111111";

const UNAUTHORIZED_ADDRESS =
  "0x9999999999999999999999999999999999999999";

const CONTRACT_ADDRESS =
  "0x2222222222222222222222222222222222222222";

function createPdfFile(
  name = "certificate.pdf",
  size = 100,
): File {

  const pdfHeader = new TextEncoder().encode("%PDF-");

  const bytes = new Uint8Array(
    Math.max(size, pdfHeader.length),
  );

  bytes.set(pdfHeader);

  return new File(
    [bytes],
    name,
    {
      type: "application/pdf",
    },
  );
}

function createRequest({
  file = createPdfFile(),
  address = VALID_ADDRESS,
  timestamp = Date.now(),
  signature = "valid-signature",
  studentId = "STU-001",
}: {
  file?: File | null;
  address?: string;
  timestamp?: number;
  signature?: string;
  studentId?: string;
} = {}) {
  const formData = new FormData();

  if (file) {
    formData.append(
      "file",
      file,
    );
  }

  formData.append(
    "studentId",
    studentId,
  );

  formData.append(
    "address",
    address,
  );

  formData.append(
    "timestamp",
    timestamp.toString(),
  );

  formData.append(
    "signature",
    signature,
  );

  return new Request(
    "http://localhost/api/pinata",
    {
      method: "POST",
      body: formData,
    },
  );
}

function mockPinataSuccess() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          IpfsHash:
            "bafy-test-certificate-cid",
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
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      process.env.PINATA_JWT =
        "test-pinata-jwt";

      process.env.NEXT_PUBLIC_RPC_URL =
        "http://localhost:8545";

      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS =
        CONTRACT_ADDRESS;

      mockedVerifyMessage.mockReturnValue(
        VALID_ADDRESS,
      );

      mockIssuerRole.mockResolvedValue(
        "0xISSUER_ROLE",
      );

      mockHasRole.mockResolvedValue(
        true,
      );

      mockPinataSuccess();
    });

    it(
      "rejects a request without authentication data",
      async () => {
        const formData =
          new FormData();

        formData.append(
          "file",
          createPdfFile(),
        );

        formData.append(
          "studentId",
          "STU-001",
        );

        const request =
          new Request(
            "http://localhost/api/pinata",
            {
              method: "POST",
              body: formData,
            },
          );

        const response =
          await POST(request);

        expect(
          response.status,
        ).toBe(401);

        const body =
          await response.json();

        expect(body.error).toBe(
          "Authentication data is required.",
        );

        expect(
          global.fetch,
        ).not.toHaveBeenCalledWith(
          expect.stringContaining(
            "pinata.cloud",
          ),
          expect.anything(),
        );
      },
    );

    it(
      "rejects an invalid wallet signature",
      async () => {
        mockedVerifyMessage.mockImplementation(
          () => {
            throw new Error(
              "Invalid signature",
            );
          },
        );

        const request =
          createRequest();

        const response =
          await POST(request);

        expect(
          response.status,
        ).toBe(401);

        const body =
          await response.json();

        expect(body.error).toBe(
          "Invalid wallet signature.",
        );

        expect(
          mockHasRole,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "rejects when the recovered wallet does not match the supplied address",
      async () => {
        mockedVerifyMessage.mockReturnValue(
          UNAUTHORIZED_ADDRESS,
        );

        const request =
          createRequest();

        const response =
          await POST(request);

        expect(
          response.status,
        ).toBe(401);

        const body =
          await response.json();

        expect(body.error).toBe(
          "Wallet authentication failed.",
        );

        expect(
          mockHasRole,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "rejects an expired authentication request",
      async () => {
        const expiredTimestamp =
          Date.now() -
          10 * 60 * 1000;

        const request =
          createRequest({
            timestamp:
              expiredTimestamp,
          });

        const response =
          await POST(request);

        expect(
          response.status,
        ).toBe(401);

        const body =
          await response.json();

        expect(body.error).toBe(
          "Authentication request expired.",
        );

        expect(
          mockedVerifyMessage,
        ).not.toHaveBeenCalled();

        expect(
          mockHasRole,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "rejects a future timestamp outside the allowed clock-skew window",
      async () => {
        const futureTimestamp =
          Date.now() +
          10 * 60 * 1000;

        const request =
          createRequest({
            timestamp:
              futureTimestamp,
          });

        const response =
          await POST(request);

        expect(
          response.status,
        ).toBe(401);

        const body =
          await response.json();

        expect(body.error).toBe(
          "Authentication request expired.",
        );

        expect(
          mockedVerifyMessage,
        ).not.toHaveBeenCalled();

        expect(
          mockHasRole,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "rejects a valid wallet that does not have ISSUER_ROLE",
      async () => {
        mockHasRole.mockResolvedValue(
          false,
        );

        const request =
          createRequest();

        const response =
          await POST(request);

        expect(
          response.status,
        ).toBe(403);

        const body =
          await response.json();

        expect(body.error).toBe(
          "This wallet is not authorized to upload academic credentials.",
        );

        expect(
          mockIssuerRole,
        ).toHaveBeenCalled();

        expect(
          mockHasRole,
        ).toHaveBeenCalledWith(
          "0xISSUER_ROLE",
          VALID_ADDRESS,
        );

        expect(
          global.fetch,
        ).not.toHaveBeenCalledWith(
          expect.stringContaining(
            "pinata.cloud",
          ),
          expect.anything(),
        );
      },
    );

    it(
      "rejects a request without a file",
      async () => {
        const request =
          createRequest({
            file: null,
          });

        const response =
          await POST(request);

        expect(
          response.status,
        ).toBe(400);

        const body =
          await response.json();

        expect(body.error).toBe(
          "A PDF file is required.",
        );

        expect(
          global.fetch,
        ).not.toHaveBeenCalledWith(
          expect.stringContaining(
            "pinata.cloud",
          ),
          expect.anything(),
        );
      },
    );

    it(
      "rejects a non-PDF file",
      async () => {
        const file =
          new File(
            ["not a pdf"],
            "certificate.txt",
            {
              type: "text/plain",
            },
          );

        const request =
          createRequest({
            file,
          });

        const response =
          await POST(request);

        expect(
          response.status,
        ).toBe(415);

        const body =
          await response.json();

        expect(body.error).toBe(
          "Only PDF files are allowed.",
        );

        expect(
          global.fetch,
        ).not.toHaveBeenCalledWith(
          expect.stringContaining(
            "pinata.cloud",
          ),
          expect.anything(),
        );
      },
    );

    it(
      "rejects a file whose MIME type is PDF but whose content is not a PDF",
      async () => {
        const invalidPdf =
          new File(
            ["HELLO WORLD"],
            "certificate.pdf",
            {
              type: "application/pdf",
            },
          );

        const request =
          createRequest({
            file: invalidPdf,
          });

        const response =
          await POST(request);

        expect(
          response.status,
        ).toBe(415);

        const body =
          await response.json();

        expect(body.error).toBe(
          "The uploaded file is not a valid PDF.",
        );

        expect(
          global.fetch,
        ).not.toHaveBeenCalledWith(
          expect.stringContaining(
            "pinata.cloud",
          ),
          expect.anything(),
        );
      },
    );

    it(
      "rejects a PDF larger than 5 MB",
      async () => {
        const largeFile =
          createPdfFile(
            "large-certificate.pdf",
            5 * 1024 * 1024 + 1,
          );

        const request =
          createRequest({
            file: largeFile,
          });

        const response =
          await POST(request);

        expect(
          response.status,
        ).toBe(413);

        const body =
          await response.json();

        expect(body.error).toBe(
          "The PDF file must not exceed 5 MB.",
        );

        expect(
          global.fetch,
        ).not.toHaveBeenCalledWith(
          expect.stringContaining(
            "pinata.cloud",
          ),
          expect.anything(),
        );
      },
    );

    it(
      "uploads a valid PDF from an authorized issuer",
      async () => {
        const request =
          createRequest({
            file:
              createPdfFile(
                "certificate.pdf",
                100,
              ),
          });

        const response =
          await POST(request);

        expect(
          response.status,
        ).toBe(200);

        const body =
          await response.json();

        expect(body.cid).toBe(
          "bafy-test-certificate-cid",
        );

        expect(
          mockedVerifyMessage,
        ).toHaveBeenCalled();

        expect(
          mockIssuerRole,
        ).toHaveBeenCalled();

        expect(
          mockHasRole,
        ).toHaveBeenCalledWith(
          "0xISSUER_ROLE",
          VALID_ADDRESS,
        );

        expect(
          global.fetch,
        ).toHaveBeenCalledWith(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          expect.objectContaining({
            method: "POST",
            headers: {
              Authorization:
                "Bearer test-pinata-jwt",
            },
          }),
        );
      },
    );

    it(
      "does not upload to Pinata when authentication fails",
      async () => {
        mockedVerifyMessage.mockImplementation(
          () => {
            throw new Error(
              "Invalid signature",
            );
          },
        );

        const request =
          createRequest();

        await POST(request);

        const fetchMock =
          vi.mocked(global.fetch);

        const pinataCalls =
          fetchMock.mock.calls.filter(
            ([url]) =>
              String(url).includes(
                "pinata.cloud",
              ),
          );

        expect(
          pinataCalls,
        ).toHaveLength(0);
      },
    );

    it(
      "does not upload to Pinata when authorization fails",
      async () => {
        mockHasRole.mockResolvedValue(
          false,
        );

        const request =
          createRequest();

        await POST(request);

        const fetchMock =
          vi.mocked(global.fetch);

        const pinataCalls =
          fetchMock.mock.calls.filter(
            ([url]) =>
              String(url).includes(
                "pinata.cloud",
              ),
          );

        expect(
          pinataCalls,
        ).toHaveLength(0);
      },
    );

    it(
      "returns the CID returned by Pinata",
      async () => {
        const pinataFetch =
          vi.fn().mockResolvedValue(
            new Response(
              JSON.stringify({
                IpfsHash:
                  "bafy-another-test-cid",
              }),
              {
                status: 200,
                headers: {
                  "Content-Type":
                    "application/json",
                },
              },
            ),
          );

        vi.stubGlobal(
          "fetch",
          pinataFetch,
        );

        const request =
          createRequest();

        const response =
          await POST(request);

        expect(
          response.status,
        ).toBe(200);

        const body =
          await response.json();

        expect(body.cid).toBe(
          "bafy-another-test-cid",
        );
      },
    );

    it(
      "returns an error when Pinata fails",
      async () => {
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
          createRequest();

        const response =
          await POST(request);

        expect(
          response.status,
        ).toBe(502);

        const body =
          await response.json();

        expect(body.error).toBe(
          "Pinata service unavailable",
        );
      },
    );

    it(
      "does not expose the Pinata JWT in the response",
      async () => {
        const request =
          createRequest();

        const response =
          await POST(request);

        const responseText =
          JSON.stringify(
            await response.json(),
          );

        expect(
          responseText,
        ).not.toContain(
          "test-pinata-jwt",
        );
      },
    );
  },
);
