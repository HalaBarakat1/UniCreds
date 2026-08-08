"use client";

import { useState } from "react";
import {
  CheckCircle,
  CopySimple,
  FileArrowDown,
  ShieldCheck,
} from "@phosphor-icons/react";
import {
  formatTimestamp,
  getIpfsUrl,
  shortValue,
  type OnChainCredential,
} from "@/lib/university-contract";

interface CredentialCardProps {
  credential: OnChainCredential;
  locale: "ar" | "en";
}

export default function CredentialCard({ credential, locale }: CredentialCardProps) {
  const isArabic = locale === "ar";
  const [copiedField, setCopiedField] = useState<"hash" | "cid" | null>(null);

  const labels = {
    title: isArabic ? "اعتماد أكاديمي موثق" : "Verified Academic Credential",
    issuer: isArabic ? "الجهة المصدرة" : "Issuer",
    hash: isArabic ? "بصمة الشهادة" : "Credential Hash",
    issueDate: isArabic ? "تاريخ الإصدار" : "Issue Date",
    cid: isArabic ? "معرّف IPFS" : "IPFS CID",
    view: isArabic ? "عرض الملف" : "View document",
    copy: isArabic ? "نسخ" : "Copy",
    copied: isArabic ? "تم النسخ" : "Copied",
    valid: isArabic ? "سارية" : "Valid",
    revoked: isArabic ? "ملغاة" : "Revoked",
    reason: isArabic ? "سبب الإلغاء" : "Revocation reason",
  };

  async function handleCopy(value: string, field: "hash" | "cid") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1600);
    } catch {
      setCopiedField(null);
    }
  }

  function CopyButton({ value, field }: { value: string; field: "hash" | "cid" }) {
    return (
      <button
        type="button"
        onClick={() => handleCopy(value, field)}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:border-brand-accent hover:text-brand-accent"
      >
        <CopySimple className="w-3.5 h-3.5" />
        {copiedField === field ? labels.copied : labels.copy}
      </button>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 md:p-6 relative overflow-hidden border-t-4 border-t-brand-accent h-full">
      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="w-12 h-12 rounded-full bg-brand-beige flex items-center justify-center text-brand-accent flex-shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <span
          className={`text-[10px] px-2 py-1 rounded uppercase font-bold tracking-wider flex items-center gap-1 ${
            credential.isValid ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"
          }`}
        >
          <CheckCircle className="w-3 h-3" />
          {credential.isValid ? labels.valid : labels.revoked}
        </span>
      </div>

      <h4 className="font-serif text-lg md:text-xl text-brand-dark mb-1">{labels.title}</h4>
      <p className="text-sm text-brand-accent font-medium mb-4 break-words">{credential.issuerName}</p>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between gap-3 text-xs border-b border-gray-100 pb-2">
          <span className="text-gray-400">{labels.issuer}</span>
          <span className="text-gray-700 font-medium font-mono text-right break-all max-w-[55%]">
            {shortValue(credential.issuerAddress)}
          </span>
        </div>

        <div className="border-b border-gray-100 pb-2">
          <div className="flex items-start justify-between gap-3 mb-2 text-xs">
            <span className="text-gray-400">{labels.hash}</span>
            <CopyButton value={credential.hash} field="hash" />
          </div>
          <p className="text-gray-700 font-medium font-mono text-right break-all text-xs">
            {shortValue(credential.hash, 10, 8)}
          </p>
        </div>

        <div className="border-b border-gray-100 pb-2">
          <div className="flex items-start justify-between gap-3 mb-2 text-xs">
            <span className="text-gray-400">{labels.cid}</span>
            <CopyButton value={credential.ipfsCID} field="cid" />
          </div>
          <p className="text-gray-700 font-medium font-mono text-right break-all text-xs">
            {shortValue(credential.ipfsCID, 10, 8)}
          </p>
        </div>

        <div className="flex justify-between gap-3 text-xs border-b border-gray-100 pb-2">
          <span className="text-gray-400">{labels.issueDate}</span>
          <span className="text-gray-700 font-medium text-right">{formatTimestamp(credential.issueTimestamp, locale)}</span>
        </div>

        {!credential.isValid && credential.revocationReason ? (
          <div className="text-xs rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-red-600 break-words">
            <strong>{labels.reason}: </strong>
            {credential.revocationReason}
          </div>
        ) : null}
      </div>

      <div className="pt-4 border-t border-gray-100">
        <a
          href={getIpfsUrl(credential.ipfsCID)}
          target="_blank"
          rel="noreferrer"
          className="w-full bg-white border border-gray-200 hover:border-brand-accent hover:text-brand-accent text-gray-600 text-xs py-2 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-1"
        >
          <FileArrowDown className="w-4 h-4" />
          {labels.view}
        </a>
      </div>
    </div>
  );
}
