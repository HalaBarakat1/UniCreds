"use client";

import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle, Plugs, WarningCircle, Wallet } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import {
  SEPOLIA_CHAIN_ID,
  hasAdminRole,
  isRegisteredUniversity,
} from "@/lib/university-contract";

export type PortalRole = "university" | "student" | "admin";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

interface RoleState {
  account: string | null;
  isConnecting: boolean;
  error: string | null;
}

interface Web3ContextValue {
  states: Record<PortalRole, RoleState>;
  connectWallet: (role: PortalRole, locale: "ar" | "en") => Promise<void>;
  disconnectWallet: (role: PortalRole) => void;
  shortenAddress: (address: string | null) => string;
}

const EMPTY_STATE: RoleState = { account: null, isConnecting: false, error: null };
const SEPOLIA_CHAIN_HEX = `0x${SEPOLIA_CHAIN_ID.toString(16)}`;

const Web3Context = createContext<Web3ContextValue | null>(null);

function roleFromPath(pathname: string): PortalRole | null {
  if (pathname.includes("/university")) return "university";
  if (pathname.includes("/admin")) return "admin";
  if (pathname.includes("/student")) return "student";
  return null;
}

function shortenAddress(address: string | null) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function wrongNetworkMessage(locale: "ar" | "en") {
  return locale === "ar"
    ? "أنت على الشبكة الخاطئة، يرجى التبديل إلى Sepolia في MetaMask ثم إعادة المحاولة."
    : "You're on the wrong network. Please switch MetaMask to Sepolia and try again.";
}

export function Web3Provider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousRoleRef = useRef<PortalRole | null>(null);
  const connectingRolesRef = useRef<Record<PortalRole, boolean>>({
    university: false,
    student: false,
    admin: false,
  });

  const [states, setStates] = useState<Record<PortalRole, RoleState>>({
    university: { ...EMPTY_STATE },
    student: { ...EMPTY_STATE },
    admin: { ...EMPTY_STATE },
  });

  const patchRole = useCallback((role: PortalRole, patch: Partial<RoleState>) => {
    setStates((prev) => ({ ...prev, [role]: { ...prev[role], ...patch } }));
  }, []);

  useEffect(() => {
    const currentRole = roleFromPath(pathname ?? "");
    const previousRole = previousRoleRef.current;

    if (previousRole && previousRole !== currentRole) {
      connectingRolesRef.current[previousRole] = false;
      patchRole(previousRole, {
        account: null,
        error: null,
        isConnecting: false,
      });
    }

    previousRoleRef.current = currentRole;
  }, [pathname, patchRole]);

  const connectWallet = useCallback(
    async (role: PortalRole, locale: "ar" | "en") => {
      const isArabic = locale === "ar";

      if (typeof window === "undefined" || !window.ethereum) {
        patchRole(role, {
          error: isArabic
            ? "لم يتم العثور على MetaMask. يرجى تثبيته أولاً."
            : "MetaMask is not installed. Please install it first.",
        });
        return;
      }

      if (connectingRolesRef.current[role]) {
        return;
      }

      connectingRolesRef.current[role] = true;
      patchRole(role, { account: null, isConnecting: true, error: null });

      try {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });

        const accounts = (await window.ethereum.request({
          method: "eth_requestAccounts",
        })) as string[];

        const account = accounts?.[0] ?? null;
        if (!account) {
          patchRole(role, {
            account: null,
            error: isArabic ? "لم يتم اختيار أي حساب." : "No wallet account was selected.",
          });
          return;
        }

        if (role !== "student") {
          const chainId = (await window.ethereum.request({
            method: "eth_chainId",
          })) as string;

          if ((chainId ?? "").toLowerCase() !== SEPOLIA_CHAIN_HEX) {
            patchRole(role, {
              account: null,
              error: wrongNetworkMessage(locale),
            });
            return;
          }
        }

        if (role === "admin") {
          const allowed = await hasAdminRole(account);
          if (!allowed) {
            patchRole(role, {
              account: null,
              error: isArabic
                ? "هذا الحساب لا يملك صلاحية الأدمن. تم رفض الدخول إلى بوابة الأدمن."
                : "This account does not have the Admin role. Access to the admin portal was denied.",
            });
            return;
          }
        } else if (role === "university") {
          const registered = await isRegisteredUniversity(account);
          if (!registered) {
            patchRole(role, {
              account: null,
              error: isArabic
                ? "هذا الحساب ليس جامعة مسجّلة من قبل الأدمن. تم رفض الدخول إلى بوابة الجامعة."
                : "This account is not a university registered by the admin. Access to the university portal was denied.",
            });
            return;
          }
        }

        patchRole(role, { account, error: null });
      } catch {
        const message = isArabic
          ? "تم رفض الاتصال بالمحفظة أو تعذّر إكماله."
          : "The wallet connection was rejected or could not be completed.";

        patchRole(role, { account: null, error: message });
      } finally {
        connectingRolesRef.current[role] = false;
        patchRole(role, { isConnecting: false });
      }
    },
    [patchRole],
  );

  const disconnectWallet = useCallback(
    (role: PortalRole) => {
      connectingRolesRef.current[role] = false;
      patchRole(role, { account: null, error: null, isConnecting: false });
    },
    [patchRole],
  );

  const value = useMemo<Web3ContextValue>(
    () => ({ states, connectWallet, disconnectWallet, shortenAddress }),
    [states, connectWallet, disconnectWallet],
  );

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used inside Web3Provider");
  }
  return context;
}

export function useRoleWallet(role: PortalRole) {
  const { states, connectWallet, disconnectWallet, shortenAddress } = useWeb3();
  const state = states[role];
  return {
    account: state.account,
    isConnecting: state.isConnecting,
    error: state.error,
    shortAccount: shortenAddress(state.account),
    connect: (locale: "ar" | "en") => connectWallet(role, locale),
    disconnect: () => disconnectWallet(role),
  };
}

interface WalletGateProps {
  role: PortalRole;
  locale: "ar" | "en";
  children: ReactNode;
}

export function WalletGate({ role, locale, children }: WalletGateProps) {
  const { account, isConnecting, error, connect } = useRoleWallet(role);
  const isArabic = locale === "ar";

  if (account) return <>{children}</>;

  const subtitleByRole: Record<PortalRole, string> = {
    university: isArabic
      ? "يرجى الاتصال بمحفظة الجامعة المسجّلة قبل عرض أدوات الإصدار والإلغاء. يُسمح فقط للجامعات المعتمدة من الأدمن."
      : "Connect the registered university wallet before viewing issuing and revocation tools. Only admin-approved universities are allowed.",
    student: isArabic
      ? "يرجى الاتصال بمحفظة الطالب لعرض الشهادات المرتبطة بهذا العنوان فقط."
      : "Connect the student wallet to show only credentials linked to this address.",
    admin: isArabic
      ? "يرجى الاتصال بمحفظة الأدمن التي تملك صلاحية الإدارة. سيتم رفض أي حساب لا يملك Admin Role."
      : "Connect the admin wallet that holds the Admin role. Any account without the Admin role will be rejected.",
  };

  const copy = {
    title: isArabic ? "اتصال المحفظة مطلوب" : "Wallet connection required",
    subtitle: subtitleByRole[role],
    button: isArabic ? "الاتصال بـ MetaMask" : "Connect MetaMask",
    connecting: isArabic ? "جارٍ الاتصال..." : "Connecting...",
    note: isArabic
      ? "كل بوابة تحتفظ باتصال محفظة مستقل. بوابة التحقق العامة لا تحتاج إلى محفظة."
      : "Each portal keeps an independent wallet connection. The public verification portal needs no wallet.",
    installed: isArabic ? "تأكد من تثبيت إضافة MetaMask في المتصفح." : "Make sure the MetaMask browser extension is installed.",
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-10">
      <div className="glass-panel rounded-3xl p-8 md:p-10 max-w-lg w-full text-center relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-accent via-yellow-500 to-brand-accent" />
        <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-brand-beige/70 text-brand-accent flex items-center justify-center shadow-sm">
          <Wallet className="w-10 h-10" />
        </div>
        <h2 className="font-serif text-3xl text-brand-dark mb-3">{copy.title}</h2>
        <p className="text-gray-500 leading-7 mb-6">{copy.subtitle}</p>

        {error && (
          <div className="mb-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm p-4 flex gap-2 text-start">
            <WarningCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => connect(locale)}
          disabled={isConnecting}
          className="w-full py-3.5 rounded-2xl bg-brand-dark hover:bg-black text-white font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isConnecting ? <Plugs className="w-5 h-5 animate-pulse" /> : <CheckCircle className="w-5 h-5" />}
          {isConnecting ? copy.connecting : copy.button}
        </button>

        <p className="mt-5 text-xs text-gray-400 leading-6">
          {copy.note}
          <br />
          {copy.installed}
        </p>
      </div>
    </div>
  );
}
