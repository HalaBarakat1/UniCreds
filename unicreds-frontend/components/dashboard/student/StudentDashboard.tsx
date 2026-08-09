"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FunnelSimple,
  IdentificationCard,
  Fingerprint,
  MagnifyingGlass,
  SpinnerGap,
} from "@phosphor-icons/react";
import CopyAddressButton from "@/components/dashboard/student/CopyAddressButton";
import CredentialCard from "@/components/dashboard/student/CredentialCard";
import { useRoleWallet } from "@/components/dashboard/web3provider";
import {
  fetchStudentCredentials,
  isRpcAvailabilityError,
  parseContractError,
  type OnChainCredential,
} from "@/lib/university-contract";
import type { StudentDictionary } from "@/types/dashboard";

interface StudentDashboardProps {
  student: StudentDictionary;
  locale: "ar" | "en";
}

export default function StudentDashboard({ student, locale }: StudentDashboardProps) {
  const { account } = useRoleWallet("student");
  const [credentials, setCredentials] = useState<OnChainCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [revokedOnly, setRevokedOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCredentials() {
      if (!account) return;
      setLoading(true);
      setError(null);
      setNotice(null);

      try {
        const results = await fetchStudentCredentials(account);
        if (!cancelled) {
          setCredentials(results);
        }
      } catch (err) {
        if (!cancelled) {
          if (isRpcAvailabilityError(err)) {
            console.error(err);
            setCredentials([]);
            setError(null);
            setNotice(
              locale === "ar"
                ? "تعذر تحميل الشهادات الآن. أعد تحديث الصفحة بعد لحظات."
                : "Credentials could not be loaded right now. Refresh the page in a moment.",
            );
          } else {
            setError(parseContractError(err, locale));
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCredentials();
    return () => {
      cancelled = true;
    };
  }, [account, locale]);

  const copy = {
    searchPlaceholder:
      locale === "ar"
        ? "ابحث باسم الجهة أو بصمة الشهادة أو CID..."
        : "Search by issuer, credential hash, or CID...",
    searchEmpty:
      locale === "ar"
        ? "لا توجد شهادات مطابقة لبحثك."
        : "No credentials matched your search.",
    noRevoked:
      locale === "ar"
        ? "لا توجد شهادات ملغاة في هذه المحفظة."
        : "There are no revoked credentials in this wallet.",
    all: locale === "ar" ? "الكل" : "All",
    revokedOnly: locale === "ar" ? "الملغاة فقط" : "Revoked only",
    filters: locale === "ar" ? "التصفية" : "Filter",
  };

  const filteredCredentials = useMemo(() => {
    const value = query.trim().toLowerCase();
    let nextCredentials = credentials;

    if (revokedOnly) {
      nextCredentials = nextCredentials.filter((credential) => !credential.isValid);
    }

    if (!value) return nextCredentials;
    return nextCredentials.filter((credential) => {
      return (
        credential.issuerName.toLowerCase().includes(value) ||
        credential.hash.toLowerCase().includes(value) ||
        credential.ipfsCID.toLowerCase().includes(value) ||
        credential.issuerAddress.toLowerCase().includes(value) ||
        credential.revocationReason.toLowerCase().includes(value)
      );
    });
  }, [credentials, query, revokedOnly]);

  return (
    <section>
      <div className="glass-panel rounded-3xl p-6 md:p-8 mb-8 md:mb-10 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-brand-accent to-yellow-700 flex items-center justify-center text-white shadow-lg z-10 flex-shrink-0">
          <IdentificationCard className="w-8 h-8 md:w-10 md:h-10" />
        </div>
        <div className="z-10 text-center md:text-start min-w-0">
          <h2 className="font-serif text-2xl md:text-3xl text-brand-dark mb-1">{student.walletTitle}</h2>
          <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500 text-sm flex-wrap">
            <span className="font-mono bg-white/50 px-2 py-1 rounded break-all max-w-full">{account}</span>
            {account ? <CopyAddressButton value={account} label={student.copyAddress} /> : null}
          </div>
        </div>
        <Fingerprint className="absolute end-[-20px] bottom-[-40px] w-[160px] h-[160px] md:w-[180px] md:h-[180px] text-brand-accent opacity-[0.03] pointer-events-none" />
      </div>

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-[0.1em] uppercase text-gray-400">{student.sectionTitle}</h3>
          <span className="mt-2 inline-flex text-xs text-gray-400 bg-white/70 px-3 py-1 rounded-full">
            {filteredCredentials.length}/{credentials.length}
          </span>
        </div>

        <div className="flex w-full flex-col gap-3 xl:max-w-2xl xl:items-end">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/70 p-1 self-start xl:self-auto">
            <span className="px-2 text-xs text-gray-400 inline-flex items-center gap-1">
              <FunnelSimple className="w-3.5 h-3.5" /> {copy.filters}
            </span>
            <button
              type="button"
              onClick={() => setRevokedOnly(false)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                !revokedOnly ? "bg-brand-dark text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {copy.all}
            </button>
            <button
              type="button"
              onClick={() => setRevokedOnly(true)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                revokedOnly ? "bg-brand-dark text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {copy.revokedOnly}
            </button>
          </div>

          <div className="relative w-full xl:max-w-md">
            <MagnifyingGlass className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-4 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="elegant-input w-full text-sm ps-12 pe-4"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-3xl p-8 md:p-10 text-center text-gray-500 flex items-center justify-center gap-3">
          <SpinnerGap className="w-5 h-5 animate-spin" />
          <span>{locale === "ar" ? "جارٍ تحميل شهادات المحفظة..." : "Loading wallet credentials..."}</span>
        </div>
      ) : error ? (
        <div className="glass-card rounded-3xl p-8 md:p-10 text-center text-red-600">{error}</div>
      ) : notice ? (
        <div className="glass-card rounded-3xl border border-dashed border-gray-200 p-8 md:p-10 text-center text-gray-500">
          {notice}
        </div>
      ) : credentials.length > 0 && filteredCredentials.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 md:p-10 text-center text-gray-500">
          {revokedOnly ? copy.noRevoked : copy.searchEmpty}
        </div>
      ) : credentials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {filteredCredentials.map((credential) => (
            <CredentialCard key={credential.hash} credential={credential} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-8 md:p-10 text-center text-gray-500">
          <p className="font-serif text-2xl text-brand-dark mb-2">{student.emptyTitle}</p>
          <p>{student.emptyDescription}</p>
        </div>
      )}
    </section>
  );
}
