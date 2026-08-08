"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldStar, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import IssueForm from "@/components/dashboard/university/IssueForm";
import RecordsTable from "@/components/dashboard/university/RecordsTable";
import SuccessToast from "@/components/ui/SuccessToast";
import { useRoleWallet } from "@/components/dashboard/web3provider";
import {
  CONTRACT_ADDRESS,
  fetchIssuerCredentials,
  getUniversityProfile,
  isRpcAvailabilityError,
  parseContractError,
  shortValue,
  type OnChainCredential,
  type UniversityProfile,
} from "@/lib/university-contract";
import type { UniversityDictionary } from "@/types/dashboard";

interface UniversityDashboardProps {
  university: UniversityDictionary;
  locale: "ar" | "en";
}

export default function UniversityDashboard({ university, locale }: UniversityDashboardProps) {
  const { account } = useRoleWallet("university");
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [rows, setRows] = useState<OnChainCredential[]>([]);
  const [profile, setProfile] = useState<UniversityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showSuccessToast = useCallback((message: string) => {
    setSuccessToast(message);
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = setTimeout(() => {
      setSuccessToast(null);
    }, 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const refreshRecords = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const [credentials, nextProfile] = await Promise.all([
        fetchIssuerCredentials(account),
        getUniversityProfile(account),
      ]);
      setRows(credentials);
      setProfile(nextProfile);
    } catch (err) {
      if (isRpcAvailabilityError(err)) {
        console.error(err);
        setRows([]);
        setError(null);
        setNotice(
          locale === "ar"
            ? "تعذر تحميل سجلات الجامعة الآن. أعد تحديث الصفحة بعد لحظات."
            : "University records could not be loaded right now. Refresh the page in a moment.",
        );
      } else {
        setError(parseContractError(err, locale));
      }
    } finally {
      setLoading(false);
    }
  }, [account, locale]);

  useEffect(() => {
    void refreshRecords();
  }, [refreshRecords]);

  const canManage = profile?.isActive !== false;
  const suspendedMessage =
    !canManage && profile
      ? locale === "ar"
        ? "هذه الجامعة موقوفة حالياً. يمكنها رؤية سجلاتها فقط، ولا يمكنها إصدار الشهادات أو إلغاؤها."
        : "This university is currently suspended. It can view its records only and cannot issue or revoke credentials."
      : null;

  return (
    <section>
      {successToast ? <SuccessToast message={successToast} /> : null}

      <div className="mb-8 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-beige/50 text-brand-accent text-xs font-bold tracking-wide uppercase mb-3">
            <ShieldStar className="w-4 h-4" /> {canManage ? university.badge : locale === "ar" ? "صلاحية الإصدار موقوفة" : "Issuer Role Suspended"}
          </div>
          <h2 className="font-serif text-3xl md:text-4xl text-brand-dark">{university.title}</h2>
        </div>
        <div className="text-start md:text-end">
          <p className="text-sm text-gray-500">{university.connectedContract}</p>
          <p className="font-mono text-xs text-gray-400 break-all">{CONTRACT_ADDRESS}</p>
          {account ? (
            <p className="text-xs text-gray-400 mt-2 break-all">
              {locale === "ar" ? "المحفظة المتصلة" : "Connected wallet"}:{" "}
              <span className="font-mono">{shortValue(account)}</span>
            </p>
          ) : null}
        </div>
      </div>

      {suspendedMessage ? (
        <div className="glass-card rounded-3xl p-4 md:p-5 mb-8 border border-amber-100 bg-amber-50/80 text-amber-800 flex items-start gap-3">
          <WarningCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm leading-7">{suspendedMessage}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="glass-card rounded-3xl p-8 md:p-10 text-center text-gray-500 flex items-center justify-center gap-3 mb-8">
          <SpinnerGap className="w-5 h-5 animate-spin" />
          <span>{locale === "ar" ? "جارٍ تحميل سجلات الجامعة من السلسلة..." : "Loading university records from chain..."}</span>
        </div>
      ) : null}

      {error ? <div className="glass-card rounded-3xl p-6 mb-8 text-red-600">{error}</div> : null}
      {notice ? (
        <div className="glass-card rounded-3xl border border-dashed border-gray-200 p-6 mb-8 text-center text-gray-500">
          {notice}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        <div className="xl:col-span-1">
          <IssueForm
            dict={university}
            locale={locale}
            account={account}
            onIssued={refreshRecords}
            onSuccess={showSuccessToast}
            canManage={canManage}
            disabledMessage={null}
          />
        </div>
        <div className="xl:col-span-2 min-w-0">
          <RecordsTable
            dict={university}
            locale={locale}
            rows={rows}
            account={account}
            onRevoke={refreshRecords}
            onSuccess={showSuccessToast}
            canManage={canManage}
            disabledMessage={null}
          />
        </div>
      </div>
    </section>
  );
}
