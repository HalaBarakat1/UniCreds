"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { isAddress } from "ethers";
import {
  Buildings,
  Crown,
  MagnifyingGlass,
  SpinnerGap,
  CheckCircle,
} from "@phosphor-icons/react";
import { useRoleWallet } from "@/components/dashboard/web3provider";
import SuccessToast from "@/components/ui/SuccessToast";
import {
  CONTRACT_ADDRESS,
  fetchRegisteredUniversities,
  formatTimestamp,
  isRpcAvailabilityError,
  parseContractError,
  registerUniversity,
  shortValue,
  toggleUniversityStatus,
  type UniversityProfile,
} from "@/lib/university-contract";
import type { AdminDictionary } from "@/types/dashboard";

interface AdminDashboardProps {
  admin: AdminDictionary;
  locale: "ar" | "en";
}

export default function AdminDashboard({ admin, locale }: AdminDashboardProps) {
  const { account } = useRoleWallet("admin");
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [registries, setRegistries] = useState<UniversityProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [listNotice, setListNotice] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [registering, setRegistering] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [registerStatus, setRegisterStatus] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searchedOnce, setSearchedOnce] = useState(false);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);

  const [selectedUniversity, setSelectedUniversity] =
    useState<UniversityProfile | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [showSuspendedOnly, setShowSuspendedOnly] = useState(false);

  const copy = useMemo(
    () => ({
      all: locale === "ar" ? "الكل" : "All",
      suspendedOnly: locale === "ar" ? "الموقوفة فقط" : "Suspended only",
      filters: locale === "ar" ? "تصفية" : "Filter",
      suspendedEmpty:
        locale === "ar"
          ? "لا توجد جامعات موقوفة حالياً."
          : "There are no suspended universities right now.",
      awaitingWallet: locale === "ar" ? "بانتظار تأكيد المحفظة..." : "Waiting for wallet confirmation...",
      confirming: locale === "ar" ? "بانتظار تأكيد المعاملة على السلسلة..." : "Waiting for blockchain confirmation...",
      registeringStatus: locale === "ar" ? "بانتظار تأكيد تسجيل الجامعة من المحفظة..." : "Waiting for wallet confirmation to register the university...",
      activatingStatus: locale === "ar" ? "بانتظار تأكيد إعادة التفعيل..." : "Waiting for wallet confirmation to reactivate the university...",
      suspendingStatus: locale === "ar" ? "بانتظار تأكيد إيقاف الجامعة..." : "Waiting for wallet confirmation to suspend the university...",
    }),
    [locale],
  );

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

  const refreshRegistry = useCallback(async () => {
    setLoading(true);
    setListError(null);
    setListNotice(null);
    try {
      const list = await fetchRegisteredUniversities();
      setRegistries(list);
    } catch (err) {
      if (isRpcAvailabilityError(err)) {
        console.error(err);
        setRegistries([]);
        setListError(null);
        setListNotice(
          locale === "ar"
            ? "تعذر تحميل السجل الآن. أعد تحديث الصفحة بعد لحظات."
            : "The registry could not be loaded right now. Refresh the page in a moment.",
        );
      } else {
        setListError(parseContractError(err, locale));
      }
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void refreshRegistry();
  }, [refreshRegistry]);

  const filteredRegistries = useMemo(
    () => (showSuspendedOnly ? registries.filter((profile) => !profile.isActive) : registries),
    [registries, showSuspendedOnly],
  );

  const searchResults = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return [];

    return filteredRegistries.filter((profile) => {
      const name = profile.name?.toLowerCase() ?? "";
      const address = profile.address.toLowerCase();
      return name.includes(value) || address.includes(value);
    });
  }, [query, filteredRegistries]);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (registering) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const universityAddress = String(formData.get("universityAddress") ?? "").trim();
    const rawName = formData.get("name");
    const rawLocation = formData.get("location");
    const name = typeof rawName === "string" ? rawName.trim() : "";
    const location = typeof rawLocation === "string" ? rawLocation.trim() : "";

    if (!isAddress(universityAddress)) {
      setRegisterMessage(
        locale === "ar" ? "عنوان المحفظة غير صالح." : "Invalid wallet address.",
      );
      return;
    }

    const isPurelyNumeric = (value: string) =>
      value.trim() !== "" && !Number.isNaN(Number(value.trim()));

    if (typeof rawName !== "string" || !name || isPurelyNumeric(name)) {
      setRegisterMessage(
        locale === "ar"
          ? "اسم الجامعة يجب أن يكون نصاً صالحاً."
          : "University name must valid text.",
      );
      return;
    }

    if (typeof rawLocation !== "string" || !location || isPurelyNumeric(location)) {
      setRegisterMessage(
        locale === "ar"
          ? "الموقع يجب أن يكون نصاً صالحاً."
          : "Location must be valid text.",
      );
      return;
    }

    try {
      setRegistering(true);
      setRegisterMessage(null);
      setRegisterStatus(copy.registeringStatus);
      await registerUniversity(universityAddress, name, location, account ?? undefined);
      form.reset();
      setRegisterStatus(copy.confirming);
      await refreshRegistry();
      showSuccessToast(admin.registered);
    } catch (err) {
      setRegisterMessage(parseContractError(err, locale));
    } finally {
      setRegisterStatus(null);
      setRegistering(false);
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchedOnce(Boolean(query.trim()));
  }

  function openSuspendModal(profile: UniversityProfile) {
    setSelectedUniversity(profile);
    setSuspendReason("");
    setSuspendError(null);
  }

  function closeSuspendModal() {
    if (suspending) return;
    setSelectedUniversity(null);
    setSuspendReason("");
    setSuspendError(null);
  }

  async function handleToggle(profile: UniversityProfile) {
    if (profile.isActive) {
      openSuspendModal(profile);
      return;
    }

    try {
      setPendingAddress(profile.address);
      setListError(null);
      setListNotice(copy.activatingStatus);
      await toggleUniversityStatus(profile.address, "", account ?? undefined);
      setListNotice(copy.confirming);
      await refreshRegistry();
      showSuccessToast(
        locale === "ar"
          ? "تم تفعيل الجامعة بنجاح."
          : "University activated successfully.",
      );
    } catch (err) {
      setListError(parseContractError(err, locale));
    } finally {
      setListNotice(null);
      setPendingAddress(null);
    }
  }

  async function handleConfirmSuspend() {
    if (!selectedUniversity) return;

    const trimmedReason = suspendReason.trim();
    if (!trimmedReason) {
      setSuspendError(
        locale === "ar"
          ? "يجب إدخال سبب الإيقاف."
          : "A suspension reason is required.",
      );
      return;
    }

    try {
      setSuspending(true);
      setSuspendError(null);
      setSuspendError(copy.suspendingStatus);
      await toggleUniversityStatus(
        selectedUniversity.address,
        trimmedReason,
        account ?? undefined,
      );
      setSuspendError(copy.confirming);
      await refreshRegistry();
      showSuccessToast(
        locale === "ar"
          ? "تم إيقاف الجامعة بنجاح."
          : "University suspended successfully.",
      );
      setSelectedUniversity(null);
      setSuspendReason("");
    } catch (err) {
      setSuspendError(parseContractError(err, locale));
    } finally {
      setSuspending(false);
    }
  }

  function StatusBadge({ active }: { active: boolean }) {
    return (
      <span
        className={`text-xs px-2 py-1 rounded-md font-medium ${
          active ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"
        }`}
      >
        {active ? admin.statusActive : admin.statusSuspended}
      </span>
    );
  }

  function ToggleButton({ profile }: { profile: UniversityProfile }) {
    const pending = pendingAddress === profile.address;
    return (
      <button
        type="button"
        onClick={() => handleToggle(profile)}
        disabled={pending || suspending}
        className={`text-xs font-medium uppercase tracking-wide inline-flex items-center gap-1 disabled:opacity-50 ${
          profile.isActive ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-700"
        }`}
      >
        {pending ? <SpinnerGap className="w-4 h-4 animate-spin" /> : null}
        {profile.isActive ? admin.suspend : admin.activate}
      </button>
    );
  }

  function displaySuspensionReason(profile: UniversityProfile) {
    if (profile.isActive) return "-";
    return profile.suspensionReason?.trim() || "-";
  }

  return (
    <section>
      {successToast ? <SuccessToast message={successToast} /> : null}

      <div className="mb-8 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-beige/50 text-brand-accent text-xs font-bold tracking-wide uppercase mb-3">
            <Crown className="w-4 h-4" /> {admin.badge}
          </div>
          <h2 className="font-serif text-3xl md:text-4xl text-brand-dark">{admin.title}</h2>
        </div>
        <div className="text-start md:text-end">
          <p className="text-sm text-gray-500">{admin.connectedContract}</p>
          <p className="font-mono text-xs text-gray-400 break-all">{CONTRACT_ADDRESS}</p>
          {account ? (
            <p className="text-xs text-gray-400 mt-2">
              {locale === "ar" ? "محفظة الأدمن" : "Admin wallet"}:{" "}
              <span className="font-mono">{shortValue(account)}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        <div className="xl:col-span-1 flex flex-col gap-6 md:gap-8">
          <div className="glass-card rounded-3xl p-6 md:p-8">
            <h3 className="font-serif text-xl font-semibold mb-1">{admin.registerTitle}</h3>
            <p className="text-sm text-gray-500 mb-6">{admin.registerDescription}</p>
            <form
              onSubmit={handleRegister}
              onChange={() => setRegisterMessage(null)}
              className="flex flex-col gap-5"
            >
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                  {admin.labels.universityAddress}
                </label>
                <input name="universityAddress" type="text" className="elegant-input w-full text-sm" placeholder="0x..." required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                  {admin.labels.name}
                </label>
                <input name="name" type="text" className="elegant-input w-full text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                  {admin.labels.location}
                </label>
                <input name="location" type="text" className="elegant-input w-full text-sm" required />
              </div>

              {registerMessage ? (
                <div className="rounded-2xl p-3 text-sm border bg-red-50 text-red-600 border-red-100">
                  {registerMessage}
                </div>
              ) : null}

              {registerStatus ? (
                <div className="rounded-2xl p-3 text-sm border bg-amber-50 text-amber-700 border-amber-100 flex items-center gap-2">
                  <SpinnerGap className="w-4 h-4 animate-spin" />
                  <span>{registerStatus}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={registering}
                className="mt-2 w-full py-3 rounded-xl font-medium transition-colors shadow-md flex items-center justify-center gap-2 text-white bg-brand-accent hover:bg-yellow-600 shadow-brand-accent/20 disabled:opacity-75"
              >
                {registering ? <SpinnerGap className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span>{registering ? admin.registering : admin.register}</span>
              </button>
            </form>
          </div>

          <div className="glass-card rounded-3xl p-6 md:p-8">
            <h3 className="font-serif text-xl font-semibold mb-1">{admin.searchTitle}</h3>
            <p className="text-sm text-gray-500 mb-4">{admin.searchDescription}</p>
            <div className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/70 p-1">
              <span className="px-2 text-xs text-gray-400">{copy.filters}</span>
              <button
                type="button"
                onClick={() => setShowSuspendedOnly(false)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                  !showSuspendedOnly ? "bg-brand-dark text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {copy.all}
              </button>
              <button
                type="button"
                onClick={() => setShowSuspendedOnly(true)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                  showSuspendedOnly ? "bg-brand-dark text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {copy.suspendedOnly}
              </button>
            </div>
            <form onSubmit={handleSearch} className="flex flex-col gap-4">
              <div className="relative">
                <MagnifyingGlass className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-4 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchedOnce(false);
                  }}
                  placeholder={admin.searchPlaceholder}
                  className="elegant-input w-full text-sm ps-12 pe-4"
                />
              </div>
              <button
                type="submit"
                disabled={!query.trim()}
                className="w-full py-2.5 rounded-xl bg-brand-dark hover:bg-black text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {admin.search}
              </button>
            </form>

            {searchedOnce && searchResults.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-200 p-5 text-center text-gray-500 text-sm">
                {admin.notFound}
              </div>
            ) : null}

            {searchResults.length > 0 ? (
              <div className="mt-5 space-y-4">
                {searchResults.map((profile) => (
                  <div key={profile.address} className="rounded-2xl border border-brand-beige bg-white/60 p-5 text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                      <div className="flex items-center gap-2 font-serif text-lg text-brand-dark">
                        <Buildings className="w-5 h-5 text-brand-accent flex-shrink-0" />
                        <span>{profile.name || shortValue(profile.address)}</span>
                      </div>
                      <StatusBadge active={profile.isActive} />
                    </div>
                    <dl className="space-y-2 text-gray-600">
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-400">{admin.fields.location}</dt>
                        <dd>{profile.location || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-400">{admin.fields.registeredAt}</dt>
                        <dd>{formatTimestamp(profile.registrationDate, locale)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-400">{admin.fields.address}</dt>
                        <dd className="font-mono text-xs break-all text-right">{shortValue(profile.address, 8, 6)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-400">{admin.fields.suspensionReason}</dt>
                        <dd className="text-right break-words max-w-[60%]">{displaySuspensionReason(profile)}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                      <ToggleButton profile={profile} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="xl:col-span-2 min-w-0">
          <div className="glass-panel rounded-3xl p-6 md:p-8 h-full">
            <h3 className="font-serif text-xl font-semibold mb-6 flex justify-between items-center gap-3">
              {locale === "ar" ? "سجل الجامعات المعتمدة" : "Approved University Registry"}
              <span className="text-xs font-sans font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filteredRegistries.length}
              </span>
            </h3>

            {loading ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500 flex items-center justify-center gap-3">
                <SpinnerGap className="w-5 h-5 animate-spin" />
                <span>{locale === "ar" ? "جارٍ تحميل السجل من السلسلة..." : "Loading registry from chain..."}</span>
              </div>
            ) : listError ? (
              <div className="rounded-2xl bg-red-50 border border-red-100 text-red-600 p-6">{listError}</div>
            ) : listNotice ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500">{listNotice}</div>
            ) : filteredRegistries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
                {showSuspendedOnly
                  ? copy.suspendedEmpty
                  : locale === "ar"
                    ? "لا توجد جامعات مسجّلة بعد. سجّل أول جامعة من النموذج المجاور."
                    : "No universities registered yet. Register the first one from the form."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-start elegant-table border-collapse">
                  <thead>
                    <tr>
                      <th className="py-3 px-2">{admin.fields.name}</th>
                      <th className="py-3 px-2">{admin.fields.location}</th>
                      <th className="py-3 px-2">{admin.fields.address}</th>
                      <th className="py-3 px-2">{admin.fields.registeredAt}</th>
                      <th className="py-3 px-2">{admin.fields.status}</th>
                      <th className="py-3 px-2">{admin.fields.suspensionReason}</th>
                      <th className="py-3 px-2 text-end">{locale === "ar" ? "إجراء" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredRegistries.map((profile) => (
                      <tr key={profile.address} className={profile.isActive ? "" : "text-gray-400"}>
                        <td className="py-4 px-2 font-medium text-brand-dark">{profile.name || "—"}</td>
                        <td className="py-4 px-2 text-xs">{profile.location || "—"}</td>
                        <td className="py-4 px-2 font-mono text-xs text-gray-500">{shortValue(profile.address, 8, 6)}</td>
                        <td className="py-4 px-2 text-xs">{formatTimestamp(profile.registrationDate, locale)}</td>
                        <td className="py-4 px-2"><StatusBadge active={profile.isActive} /></td>
                        <td className="py-4 px-2 text-xs max-w-[220px] break-words">{displaySuspensionReason(profile)}</td>
                        <td className="py-4 px-2 text-end"><ToggleButton profile={profile} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedUniversity ? (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 md:p-6">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-7 border border-brand-beige">
            <h4 className="font-serif text-2xl text-brand-dark mb-2">{admin.suspendTitle}</h4>
            <p className="text-sm text-gray-500 mb-5">
              {admin.suspendDescription}{" "}
              <span className="font-semibold text-brand-dark">
                {selectedUniversity.name || shortValue(selectedUniversity.address)}
              </span>
            </p>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
              {admin.suspendReasonLabel}
            </label>
            <textarea
              value={suspendReason}
              onChange={(e) => {
                setSuspendReason(e.target.value);
                setSuspendError(null);
              }}
              className="elegant-input w-full text-sm min-h-28 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={suspending}
              placeholder={admin.suspendReasonPlaceholder}
              autoFocus
            />
            {suspendError ? (
              <div className={`mt-4 rounded-2xl border p-3 text-sm ${suspending ? "border-amber-100 bg-amber-50 text-amber-700" : "border-red-100 bg-red-50 text-red-600"} flex items-center gap-2`}>
                {suspending ? <SpinnerGap className="w-4 h-4 animate-spin" /> : null}
                <span>{suspendError}</span>
              </div>
            ) : null}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="button"
                onClick={closeSuspendModal}
                disabled={suspending}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={!suspendReason.trim() || suspending}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
              >
                {suspending ? <SpinnerGap className="w-4 h-4 animate-spin" /> : null}
                {admin.confirmSuspend}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
