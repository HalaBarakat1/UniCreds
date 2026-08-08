import {
  BrowserProvider,
  Contract,
  EventLog,
  isAddress,
  JsonRpcProvider,
  ZeroAddress,
} from "ethers";
import { universityAbi } from "@/lib/abi/universityAbi";

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545";
const DEPLOYMENT_BLOCK = Number(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK ?? 0);
const MAX_LOG_BLOCK_RANGE = Number(
  process.env.NEXT_PUBLIC_LOG_BLOCK_RANGE ?? 4000,
);
const RPC_RETRY_DELAYS_MS = [350, 900, 1600] as const;
const LATEST_BLOCK_CACHE_TTL_MS = 5000;
export const SEPOLIA_CHAIN_ID = 11155111n;
const sharedRpcProvider = new JsonRpcProvider(RPC_URL);
let latestBlockCache: { value: number; expiresAt: number } | null = null;
let latestBlockPromise: Promise<number> | null = null;

export const ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export type OnChainCredential = {
  hash: string;
  studentAddress: string;
  issuerAddress: string;
  issuerName: string;
  ipfsCID: string;
  issueTimestamp: number;
  isValid: boolean;
  revocationReason: string;
};

export type UniversityProfile = {
  address: string;
  name: string;
  location: string;
  isActive: boolean;
  registrationDate: number;
  isRegistered: boolean;
  suspensionReason: string;
};

type UniversityContract = Contract;

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, listener: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
    };
  }
}

function getRpcProvider() {
  return sharedRpcProvider;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRpcAvailabilityError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();

  return (
    message.includes("too many requests") ||
    message.includes("missing response") ||
    message.includes("could not coalesce") ||
    message.includes("bad_data") ||
    message.includes("eth_blocknumber") ||
    message.includes("eth_getlogs") ||
    message.includes("429") ||
    message.includes("503") ||
    message.includes("-32005")
  );
}

async function withRpcRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RPC_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (
        attempt === RPC_RETRY_DELAYS_MS.length ||
        !isRpcAvailabilityError(error)
      ) {
        throw error;
      }

      await sleep(RPC_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
}

async function getLatestBlockNumber() {
  const now = Date.now();

  if (latestBlockCache && latestBlockCache.expiresAt > now) {
    return latestBlockCache.value;
  }

  if (!latestBlockPromise) {
    latestBlockPromise = withRpcRetry(async () => {
      const value = await getRpcProvider().getBlockNumber();
      latestBlockCache = {
        value,
        expiresAt: Date.now() + LATEST_BLOCK_CACHE_TTL_MS,
      };
      return value;
    }).finally(() => {
      latestBlockPromise = null;
    });
  }

  return latestBlockPromise;
}

async function queryFilterInChunks(
  contract: UniversityContract,
  filter: unknown,
) {
  const latestBlock = await getLatestBlockNumber();
  const fromBlock = Math.max(0, DEPLOYMENT_BLOCK);
  const chunkSize = Math.max(1, MAX_LOG_BLOCK_RANGE);
  const logs = [] as Awaited<ReturnType<typeof contract.queryFilter>>;

  for (let start = fromBlock; start <= latestBlock; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, latestBlock);
    const chunk = await withRpcRetry(() =>
      contract.queryFilter(filter as never, start, end),
    );
    logs.push(...chunk);
  }

  return logs;
}

export function shortValue(value: string, start = 6, end = 4) {
  if (!value) return "";
  if (value.length <= start + end) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export function getIpfsUrl(cid: string) {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

export function isHash(value: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(value.trim());
}

export function isCid(value: string) {
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[a-zA-Z0-9]{20,})$/.test(value.trim());
}

export function getReadContract() {
  return new Contract(CONTRACT_ADDRESS, universityAbi, getRpcProvider());
}

export async function getWriteContract(expectedAccount?: string) {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not available");
  }

  const provider = new BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();

  if (network.chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error("WRONG_NETWORK_SEPOLIA");
  }

  const signer = await provider.getSigner();

  if (expectedAccount) {
    const active = (await signer.getAddress()).toLowerCase();
    if (active !== expectedAccount.toLowerCase()) {
      throw new Error("WRONG_ACTIVE_ACCOUNT");
    }
  }

  return new Contract(CONTRACT_ADDRESS, universityAbi, signer);
}

export async function hasAdminRole(account: string) {
  if (!isAddress(account)) return false;
  const contract = getReadContract();

  try {
    return (await withRpcRetry(() =>
      contract.hasRole(ADMIN_ROLE, account),
    )) as boolean;
  } catch {
    return false;
  }
}

export async function getUniversityProfile(
  address: string,
): Promise<UniversityProfile | null> {
  if (!isAddress(address)) return null;
  const contract = getReadContract();
  const [name, location, isActive, registrationDate, suspensionReason] =
    (await withRpcRetry(() => contract.getUniversityProfile(address))) as [
      string,
      string,
      boolean,
      bigint,
      string,
    ];
  const reg = Number(registrationDate);
  return {
    address,
    name,
    location,
    isActive,
    registrationDate: reg,
    isRegistered: reg > 0,
    suspensionReason,
  };
}

export async function isRegisteredUniversity(address: string) {
  const profile = await getUniversityProfile(address);
  return Boolean(profile?.isRegistered);
}

async function getIssuedLogs(filter?: unknown) {
  const contract = getReadContract();
  const logs = await queryFilterInChunks(
    contract,
    (filter as never) ?? contract.filters.CertificateIssued(),
  );

  return logs.filter((log): log is EventLog => "args" in log);
}

async function resolveIssuerName(contract: UniversityContract, issuerAddress: string) {
  try {
    const [name] = (await withRpcRetry(() =>
      contract.getUniversityProfile(issuerAddress),
    )) as [string, string, boolean, bigint, string];
    return name?.trim() || shortValue(issuerAddress);
  } catch {
    return shortValue(issuerAddress);
  }
}

async function resolveCredentialByHash(hash: string) {
  const contract = getReadContract();
  const [isValid, studentAddress, issueDate, issuerAddress, ipfsCID] =
    (await withRpcRetry(() => contract.verifyCertificate(hash))) as [
      boolean,
      string,
      bigint,
      string,
      string,
    ];

  if (!issueDate || studentAddress === ZeroAddress || issuerAddress === ZeroAddress) {
    return null;
  }

  let revocationReason = "";
  try {
    revocationReason = (await withRpcRetry(() =>
      contract.revocationReasons(hash),
    )) as string;
  } catch {
    revocationReason = "";
  }

  const issuerName = await resolveIssuerName(contract, issuerAddress);

  return {
    hash,
    studentAddress,
    issuerAddress,
    issuerName,
    ipfsCID,
    issueTimestamp: Number(issueDate),
    isValid,
    revocationReason,
  } satisfies OnChainCredential;
}

export async function fetchCredentialByHash(hash: string) {
  if (!isHash(hash)) return null;
  return resolveCredentialByHash(hash);
}

export async function fetchStudentCredentials(studentAddress: string) {
  if (!isAddress(studentAddress)) return [];

  const contract = getReadContract();
  const logs = await getIssuedLogs(
    contract.filters.CertificateIssued(null, studentAddress),
  );
  const hashes = Array.from(
    new Set(logs.map((log) => String(log.args.certHash)).reverse()),
  );
  const credentials = await Promise.all(
    hashes.map((hash) => resolveCredentialByHash(hash)),
  );

  return credentials.filter(Boolean) as OnChainCredential[];
}

export async function fetchIssuerCredentials(issuerAddress: string) {
  if (!isAddress(issuerAddress)) return [];

  const logs = await getIssuedLogs();
  const hashes = Array.from(new Set(logs.map((log) => String(log.args.certHash))));
  const credentials = await Promise.all(
    hashes.map((hash) => resolveCredentialByHash(hash)),
  );

  return (credentials.filter(Boolean) as OnChainCredential[])
    .filter(
      (credential) =>
        credential.issuerAddress.toLowerCase() === issuerAddress.toLowerCase(),
    )
    .sort((a, b) => b.issueTimestamp - a.issueTimestamp);
}

async function findHashByCid(cid: string) {
  const logs = await getIssuedLogs();
  const match = logs.find((log) => String(log.args.ipfsCID) === cid.trim());
  return match ? String(match.args.certHash) : null;
}

async function findLatestHashByStudent(studentAddress: string) {
  const contract = getReadContract();
  const logs = await getIssuedLogs(
    contract.filters.CertificateIssued(null, studentAddress),
  );
  const latest = logs.at(-1);
  return latest ? String(latest.args.certHash) : null;
}

export async function fetchCredentialByQuery(query: string) {
  const value = query.trim();
  if (!value) return null;

  if (isHash(value)) {
    return resolveCredentialByHash(value);
  }

  if (isCid(value)) {
    const hash = await findHashByCid(value);
    return hash ? resolveCredentialByHash(hash) : null;
  }

  if (isAddress(value)) {
    const hash = await findLatestHashByStudent(value);
    return hash ? resolveCredentialByHash(hash) : null;
  }

  return null;
}

export function formatTimestamp(timestamp: number, locale: "ar" | "en") {
  if (!timestamp) return "—";
  return new Date(timestamp * 1000).toLocaleDateString(
    locale === "ar" ? "ar-SY" : "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
}

export function parseContractError(error: unknown, locale: "ar" | "en") {
  const fallback =
    locale === "ar" ? "حدث خطأ غير متوقع." : "An unexpected error occurred.";
  if (!(error instanceof Error)) return fallback;

  const message = error.message;
  const normalizedMessage = message.toLowerCase();

  if (message.includes("WRONG_NETWORK_SEPOLIA")) {
    return locale === "ar"
      ? "أنت على الشبكة الخاطئة، يرجى التبديل إلى Sepolia في MetaMask ثم إعادة المحاولة."
      : "You're on the wrong network. Please switch MetaMask to Sepolia and try again.";
  }

  if (message.includes("WRONG_ACTIVE_ACCOUNT")) {
    return locale === "ar"
      ? "الحساب النشط في MetaMask يختلف عن الحساب المتصل بهذه البوابة. بدّل الحساب في MetaMask ليطابق الحساب المتصل."
      : "The active MetaMask account differs from this portal's connected account. Switch MetaMask to the matching account.";
  }

  if (message.includes("AccessControlUnauthorizedAccount")) {
    return locale === "ar"
      ? "هذا الحساب لا يملك صلاحية تنفيذ هذه العملية على العقد."
      : "This wallet is not authorized to perform this contract action.";
  }

  if (message.includes("Already registered")) {
    return locale === "ar"
      ? "هذه الجامعة مسجلة مسبقًا."
      : "This university is already registered.";
  }

  if (message.includes("University not registered")) {
    return locale === "ar"
      ? "هذه الجامعة غير مسجلة في السجل."
      : "This university is not registered in the registry.";
  }

  if (message.includes("Suspension reason required")) {
    return locale === "ar"
      ? "يجب إدخال سبب الإيقاف قبل إيقاف الجامعة."
      : "A suspension reason is required before suspending the university.";
  }

  if (message.includes("Certificate hash already exists")) {
    return locale === "ar"
      ? "هذه الشهادة مسجلة مسبقًا على السلسلة."
      : "This certificate has already been registered on-chain.";
  }

  if (message.includes("Issuer is suspended in registry")) {
    return locale === "ar"
      ? "هذه الجهة موقوفة في سجل الجامعات ولا يمكنها الإصدار."
      : "This issuer is suspended in the university registry and cannot issue.";
  }

  if (message.includes("Not original issuer")) {
    return locale === "ar"
      ? "لا يمكن إلغاء الشهادة إلا من الجهة التي أصدرتها."
      : "Only the original issuing university can revoke this credential.";
  }

  if (
    normalizedMessage.includes("insufficient funds") ||
    normalizedMessage.includes("insufficient_funds") ||
    normalizedMessage.includes("intrinsic transaction cost")
  ) {
    return locale === "ar"
      ? "لا يوجد رصيد Sepolia ETH كافٍ في هذه المحفظة لإتمام المعاملة. أرسل بعض العملات التجريبية ثم أعد المحاولة."
      : "This wallet does not have enough Sepolia ETH to complete the transaction. Fund it with test ETH and try again.";
  }

  if (
    normalizedMessage.includes("wrong network") ||
    normalizedMessage.includes("unsupported chain") ||
    normalizedMessage.includes("chainid") ||
    normalizedMessage.includes("wallet_switchethereumchain")
  ) {
    return locale === "ar"
      ? "أنت على الشبكة الخاطئة، يرجى التبديل إلى Sepolia في MetaMask ثم إعادة المحاولة."
      : "You're on the wrong network. Please switch MetaMask to Sepolia and try again.";
  }

  if (normalizedMessage.includes("user rejected") || normalizedMessage.includes("rejected")) {
    return locale === "ar"
      ? "تم رفض العملية من المحفظة."
      : "The wallet request was rejected.";
  }

  if (
    normalizedMessage.includes("eth_getlogs") ||
    normalizedMessage.includes("eth_blocknumber") ||
    normalizedMessage.includes("range") ||
    normalizedMessage.includes("could not coalesce") ||
    normalizedMessage.includes("too many requests") ||
    normalizedMessage.includes("missing response") ||
    normalizedMessage.includes("bad_data")
  ) {
    return locale === "ar"
      ? "تعذّر تحميل بيانات السلسلة من مزوّد RPC. جرّب مرة أخرى بعد لحظات أو تحقّق من إعدادات RPC."
      : "The on-chain data could not be loaded from the RPC provider. Try again shortly or check the RPC settings.";
  }

  if (
    normalizedMessage.includes("timeout") ||
    normalizedMessage.includes("timed out") ||
    normalizedMessage.includes("etimedout") ||
    normalizedMessage.includes("econnaborted") ||
    normalizedMessage.includes("aborted")
  ) {
    return locale === "ar"
      ? "انتهت مهلة الاتصال. تحقق من اتصالك بالإنترنت وحاول مرة أخرى."
      : "The request timed out. Check your internet connection and try again.";
  }

  if (
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("network error") ||
    normalizedMessage.includes("networkerror") ||
    normalizedMessage.includes("net::") ||
    normalizedMessage.includes("no internet")
  ) {
    return locale === "ar"
      ? "تعذّر الاتصال بالخادم. تأكد من اتصالك بالإنترنت ثم أعد المحاولة."
      : "Could not reach the server. Check your internet connection and try again.";
  }

  // Any other unhandled error: log the raw message for debugging,
  // but only ever show the user a translated, friendly message.
  if (message) {
    console.error("Unhandled contract/app error:", message);
  }
  return fallback;
}

export async function registerUniversity(
  universityAddress: string,
  name: string,
  location: string,
  expectedAccount?: string,
) {
  const contract = await getWriteContract(expectedAccount);
  const tx = await contract.registerUniversity(universityAddress, name, location);
  await tx.wait();
}

export async function toggleUniversityStatus(
  universityAddress: string,
  reason: string,
  expectedAccount?: string,
) {
  const contract = await getWriteContract(expectedAccount);
  const tx = await contract.toggleUniversityStatus(universityAddress, reason);
  await tx.wait();
}

export async function fetchRegisteredUniversities(): Promise<UniversityProfile[]> {
  const contract = getReadContract();
  const logs = await queryFilterInChunks(
    contract,
    contract.filters.UniversityRegistered(),
  );
  const eventLogs = logs.filter((log): log is EventLog => "args" in log);
  const addresses = Array.from(
    new Set(eventLogs.map((log) => String(log.args.universityAddress))),
  );
  const profiles = await Promise.all(
    addresses.map((address) => getUniversityProfile(address)),
  );
  return (profiles.filter(Boolean) as UniversityProfile[])
    .filter((profile) => profile.isRegistered)
    .sort((a, b) => b.registrationDate - a.registrationDate);
}
