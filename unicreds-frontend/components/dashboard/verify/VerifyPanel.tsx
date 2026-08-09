"use client";

import { useState } from "react";
import {
  FilePdf,
  MagnifyingGlass,
  SealCheck,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { VerifyDictionary } from "@/types/dashboard";
import {
  fetchCredentialByQuery,
  formatTimestamp,
  getIpfsUrl,
  parseContractError,
  shortValue,
  type OnChainCredential,
} from "@/lib/university-contract";

interface VerifyPanelProps {
  dict: VerifyDictionary;
  locale: "ar" | "en";
}

type VerifyStatus = "idle" | "loading" | "done";

export default function VerifyPanel({ dict, locale }: VerifyPanelProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [results, setResults] = useState<OnChainCredential[]>([]);
  const [error, setError] = useState<string | null>(null);

  const labels = {
    noMatch: locale === "ar" ? "لم يتم العثور على شهادة مطابقة." : "No matching credential was found.",
    issuerAddress: locale === "ar" ? "عنوان الجهة المُصدرة" : "Issuer Address",
    cid: locale === "ar" ? "معرّف IPFS" : "IPFS CID",
    status: locale === "ar" ? "الحالة" : "Status",
    reason: locale === "ar" ? "سبب الإلغاء" : "Revocation Reason",
    revoked: locale === "ar" ? "ملغاة" : "Revoked",
  };

  async function handleVerify() {
    if (!query.trim() || status === "loading") return;
    setStatus("loading");
    setError(null);
    setResults([]);

    try {
      const credentials = await fetchCredentialByQuery(query);
      if (credentials.length === 0) {
        setError(labels.noMatch);
      } else {
        setResults(credentials);
        setStatus("done");
        return;
      }
    } catch (err) {
      setError(parseContractError(err, locale));
    }

    setStatus("idle");
  }

  return (
    <>
      <div className="glass-panel rounded-3xl p-8 md:p-12 shadow-xl mb-10 relative overflow-hidden">
        <div className="absolute top-0 end-0 w-64 h-64 bg-brand-accent rounded-full mix-blend-multiply filter blur-[80px] opacity-10 transform -translate-y-1/2 ltr:translate-x-1/2 rtl:-translate-x-1/2" />

        <div className="relative z-10 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlass className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setError(null);
              }}
              placeholder={dict.placeholder}
              className="w-full bg-white/80 border border-gray-200 rounded-2xl py-4 ps-14 pe-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all shadow-sm"
            />
          </div>
          <button
            onClick={handleVerify}
            disabled={status === "loading"}
            className="bg-brand-dark hover:bg-black disabled:opacity-70 text-white px-8 py-4 rounded-2xl font-medium transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 min-w-[160px]"
          >
            <span>{status === "loading" ? dict.verifying : dict.button}</span>
            {status === "loading" && <SpinnerGap className="w-5 h-5 animate-spin" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 rounded-3xl border border-red-100 bg-red-50 p-5 text-red-600 flex gap-3 items-start">
          <WarningCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="animate-fade-in-up space-y-6">
          <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400 mb-6">{dict.resultLabel}</h3>

          {results.map((credential) => (
            <div
              key={credential.hash}
              className={`glass-card rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-start ${credential.isValid ? "ltr:border-l-4 ltr:border-l-green-500 rtl:border-r-4 rtl:border-r-green-500" : "ltr:border-l-4 ltr:border-l-red-500 rtl:border-r-4 rtl:border-r-red-500"}`}
            >
              <div className={`flex-shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-2xl ${credential.isValid ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                <SealCheck weight="fill" className="w-9 h-9 mb-1" />
                <span className="text-xs font-bold uppercase tracking-wide">
                  {credential.isValid ? dict.valid : labels.revoked}
                </span>
              </div>

              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{dict.fields.issuerAuthority}</p>
                  <p className="font-serif text-xl text-brand-dark">{credential.issuerName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{labels.issuerAddress}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1 break-all">{credential.issuerAddress}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{dict.fields.studentAddress}</p>
                  <p className="text-sm font-mono text-gray-700 bg-gray-100 p-2 rounded-lg break-all">{credential.studentAddress}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{dict.fields.hash}</p>
                  <p className="text-sm font-mono text-gray-700 bg-gray-100 p-2 rounded-lg break-all">{credential.hash}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{labels.cid}</p>
                  <p className="text-sm font-mono text-gray-700 bg-gray-100 p-2 rounded-lg break-all">{credential.ipfsCID}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{dict.fields.issueDate}</p>
                  <p className="text-sm text-gray-700">{formatTimestamp(credential.issueTimestamp, locale)}</p>
                </div>
                {!credential.isValid && credential.revocationReason && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{labels.reason}</p>
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">{credential.revocationReason}</p>
                  </div>
                )}
                <div>
                  <a
                    href={getIpfsUrl(credential.ipfsCID)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-brand-accent hover:text-yellow-600 font-medium text-sm transition-colors mt-2"
                  >
                    <FilePdf className="w-5 h-5" /> {dict.viewOriginal}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
