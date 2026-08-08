"use client";

import { useMemo, useState } from "react";
import { FunnelSimple, MagnifyingGlass, SpinnerGap } from "@phosphor-icons/react";
import {
  formatTimestamp,
  getIpfsUrl,
  getWriteContract,
  parseContractError,
  shortValue,
  type OnChainCredential,
} from "@/lib/university-contract";
import type { UniversityDictionary } from "@/types/dashboard";

interface RecordsTableProps {
  dict: UniversityDictionary;
  locale: "ar" | "en";
  rows: OnChainCredential[];
  account: string | null;
  onRevoke: () => Promise<void> | void;
  onSuccess: (message: string) => void;
  canManage: boolean;
  disabledMessage?: string | null;
}

type RevokeState = "idle" | "awaiting_wallet" | "confirming";

export default function RecordsTable({
  dict,
  locale,
  rows,
  account,
  onRevoke,
  onSuccess,
  canManage,
  disabledMessage,
}: RecordsTableProps) {
  const [selectedRow, setSelectedRow] = useState<OnChainCredential | null>(null);
  const [reason, setReason] = useState("");
  const [revokeState, setRevokeState] = useState<RevokeState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [revokedOnly, setRevokedOnly] = useState(false);

  const copy = useMemo(
    () => ({
      noRecords:
        locale === "ar"
          ? "لا توجد سجلات صادرة من هذه الجامعة حتى الآن."
          : "No credentials have been issued by this university yet.",
      noRevoked:
        locale === "ar"
          ? "لا توجد شهادات ملغاة ضمن هذا السجل."
          : "No revoked credentials are available in this registry.",
      studentAddress: locale === "ar" ? "عنوان الطالب" : "Student Address",
      issueDate: locale === "ar" ? "تاريخ الإصدار" : "Issued At",
      document: locale === "ar" ? "الملف" : "Document",
      open: locale === "ar" ? "فتح" : "Open",
      revoked:
        locale === "ar" ? "تم إلغاء الشهادة بنجاح." : "Credential revoked successfully.",
      unavailable: locale === "ar" ? "غير متاح" : "Unavailable",
      awaitingWallet:
        locale === "ar"
          ? "بانتظار تأكيد المحفظة..."
          : "Waiting for wallet confirmation...",
      confirming:
        locale === "ar"
          ? "بانتظار تأكيد المعاملة على السلسلة..."
          : "Waiting for blockchain confirmation...",
      all: locale === "ar" ? "الكل" : "All",
      revokedOnly: locale === "ar" ? "الملغاة فقط" : "Revoked only",
      filters: locale === "ar" ? "التصفية" : "Filter",
      revocationReasonLabel: locale === "ar" ? "سبب الإلغاء" : "Revocation reason",
    }),
    [locale],
  );

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let nextRows = rows;

    if (revokedOnly) {
      nextRows = nextRows.filter((row) => !row.isValid);
    }

    if (!q) return nextRows;

    return nextRows.filter(
      (row) =>
        row.hash.toLowerCase().includes(q) ||
        row.studentAddress.toLowerCase().includes(q) ||
        row.ipfsCID.toLowerCase().includes(q) ||
        row.issuerName.toLowerCase().includes(q) ||
        row.revocationReason.toLowerCase().includes(q),
    );
  }, [rows, query, revokedOnly]);

  async function submitRevocation() {
    if (!selectedRow || !reason.trim() || !canManage) return;

    try {
      setRevokeState("awaiting_wallet");
      setError(null);
      const contract = await getWriteContract(account ?? undefined);
      const tx = await contract.revokeCertificate(selectedRow.hash, reason.trim());
      setRevokeState("confirming");
      await tx.wait();
      await onRevoke();
      setSelectedRow(null);
      setReason("");
      onSuccess(copy.revoked);
    } catch (err) {
      setError(parseContractError(err, locale));
    } finally {
      setRevokeState("idle");
    }
  }

  const revokeStatusText =
    revokeState === "awaiting_wallet"
      ? copy.awaitingWallet
      : revokeState === "confirming"
        ? copy.confirming
        : null;

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-8 h-full relative">
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h3 className="font-serif text-xl font-semibold flex items-center gap-3">
          {dict.tableTitle}
          <span className="text-xs font-sans font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {filteredRows.length}/{rows.length}
          </span>
        </h3>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/70 p-1 self-start lg:self-auto">
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
      </div>

      <div className="relative mb-6">
        <MagnifyingGlass className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-4 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.searchPlaceholder}
          className="elegant-input w-full text-sm ps-12 pe-4"
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-500">
          {copy.noRecords}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-500">
          {revokedOnly ? copy.noRevoked : dict.searchEmpty}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-start elegant-table border-collapse">
            <thead>
              <tr>
                <th className="py-3 px-2">{copy.studentAddress}</th>
                <th className="py-3 px-2">{dict.columns.hash}</th>
                <th className="py-3 px-2">{copy.issueDate}</th>
                <th className="py-3 px-2">{dict.columns.status}</th>
                <th className="py-3 px-2">{copy.revocationReasonLabel}</th>
                <th className="py-3 px-2">{copy.document}</th>
                <th className="py-3 px-2 text-end">{dict.columns.action}</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredRows.map((row) => (
                <tr key={row.hash} className={row.isValid ? "" : "text-gray-400"}>
                  <td className="py-4 px-2 font-mono text-xs break-all max-w-[180px]">
                    {row.studentAddress}
                  </td>
                  <td className="py-4 px-2 font-mono text-xs text-gray-500">
                    {shortValue(row.hash, 10, 8)}
                  </td>
                  <td className="py-4 px-2 text-xs">
                    {formatTimestamp(row.issueTimestamp, locale)}
                  </td>
                  <td className="py-4 px-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-md font-medium ${row.isValid ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"}`}
                    >
                      {row.isValid ? dict.statusValid : dict.statusRevoked}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-xs max-w-[220px] break-words">
                    {row.isValid ? "-" : row.revocationReason?.trim() || "-"}
                  </td>
                  <td className="py-4 px-2">
                    <a
                      href={getIpfsUrl(row.ipfsCID)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-accent hover:text-yellow-600 text-xs font-medium"
                    >
                      {copy.open}
                    </a>
                  </td>
                  <td className="py-4 px-2 text-end">
                    {row.isValid ? (
                      <button
                        onClick={() => {
                          setSelectedRow(row);
                          setError(null);
                        }}
                        disabled={!canManage}
                        className={`text-xs font-medium uppercase tracking-wide ${canManage ? "text-red-500 hover:text-red-700" : "text-gray-400 cursor-not-allowed"}`}
                      >
                        {canManage ? dict.revoke : copy.unavailable}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRow ? (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 md:p-6">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-7 border border-brand-beige">
            <h4 className="font-serif text-2xl text-brand-dark mb-2">{dict.revokeTitle}</h4>
            <p className="text-sm text-gray-500 mb-5">
              {dict.revokeDescription}{" "}
              <span className="font-mono text-brand-dark">
                {shortValue(selectedRow.hash, 10, 8)}
              </span>
            </p>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
              {dict.revocationReason}
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              className="elegant-input w-full text-sm min-h-28 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={revokeState !== "idle"}
              placeholder={dict.revocationPlaceholder}
              autoFocus
            />
            {error ? (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}
            {revokeStatusText ? (
              <p className="mt-4 text-xs text-gray-500">{revokeStatusText}</p>
            ) : null}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setSelectedRow(null);
                  setReason("");
                  setError(null);
                }}
                disabled={revokeState !== "idle"}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {dict.cancel}
              </button>
              <button
                type="button"
                onClick={submitRevocation}
                disabled={!canManage || !reason.trim() || revokeState !== "idle"}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
              >
                {revokeState !== "idle" ? <SpinnerGap className="w-4 h-4 animate-spin" /> : null}
                {dict.confirmRevoke}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
