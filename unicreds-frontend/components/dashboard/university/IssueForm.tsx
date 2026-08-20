"use client";

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ethers, isAddress } from "ethers";
import { SpinnerGap, UploadSimple } from "@phosphor-icons/react";
import {
  getWriteContract,
  parseContractError,
  shortValue,
} from "@/lib/university-contract";
import type { UniversityDictionary } from "@/types/dashboard";
import { createUploadAuth } from "@/lib/upload-auth";

interface IssueFormProps {
  dict: UniversityDictionary;
  locale: "ar" | "en";
  account: string | null;
  onIssued: () => Promise<void> | void;
  onSuccess: (message: string) => void;
  canManage: boolean;
  disabledMessage?: string | null;
}

type SubmitState =
  | "idle"
  | "authenticating"
  | "uploading"
  | "generating"
  | "awaiting_wallet"
  | "confirming";

type FormValues = {
  studentAddress: string;
  studentId: string;
  major: string;
  gpa: string;
};

type FormErrors = Partial<
  Record<keyof FormValues | "document" | "general", string>
>;

const EMPTY_FORM_VALUES: FormValues = {
  studentAddress: "",
  studentId: "",
  major: "",
  gpa: "",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function IssueForm({
  dict,
  locale,
  account,
  onIssued,
  onSuccess,
  canManage,
  disabledMessage,
}: IssueFormProps) {
  const [state, setState] = useState<SubmitState>("idle");
  const [formValues, setFormValues] =
    useState<FormValues>(EMPTY_FORM_VALUES);
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const copy = useMemo(
    () => ({
      selectFile:
        locale === "ar" ? "اختيار ملف PDF" : "Select PDF",

      fileRequired:
        locale === "ar"
          ? "يجب اختيار ملف PDF قبل الإصدار."
          : "A PDF file is required before issuing.",

      fileTooLarge:
        locale === "ar"
          ? "حجم الملف يجب ألا يتجاوز 5 ميغابايت."
          : "The file size must not exceed 5 MB.",

      fileInvalidType:
        locale === "ar"
          ? "يجب اختيار ملف PDF صالح."
          : "Please select a valid PDF file.",

      addressInvalid:
        locale === "ar"
          ? "أدخل عنوان محفظة طالب صالح."
          : "Enter a valid student wallet address.",

      accountRequired:
        locale === "ar"
          ? "يجب توصيل محفظة الجهة المصدرة قبل إصدار الشهادة."
          : "The issuing wallet must be connected before issuing a credential.",

      studentIdRequired:
        locale === "ar"
          ? "أدخل الرقم الجامعي."
          : "Enter the student ID.",

      studentIdInvalidType:
        locale === "ar"
          ? "الرقم الجامعي يجب أن يكون نصاً أو رقماً فقط."
          : "Student ID must be text or a number only.",

      majorRequired:
        locale === "ar"
          ? "أدخل التخصص."
          : "Enter the major.",

      majorInvalidType:
        locale === "ar"
          ? "التخصص يجب أن يكون نصاً صالحاً."
          : "Major must be valid text.",

      gpaInvalid:
        locale === "ar"
          ? "أدخل معدلاً صالحاً بين 60 و 100."
          : "Enter a valid numeric GPA between 60 and 100.",

      success:
        locale === "ar"
          ? "تم إصدار الشهادة وربطها بالسلسلة بنجاح."
          : "Credential issued and anchored on-chain successfully.",

      transaction:
        locale === "ar"
          ? "بصمة الشهادة"
          : "Credential hash",

      authenticating:
        locale === "ar"
          ? "بانتظار توقيع المصادقة من المحفظة..."
          : "Waiting for wallet authentication signature...",

      uploading:
        locale === "ar"
          ? "جارٍ رفع المستند..."
          : "Uploading document...",

      generating:
        locale === "ar"
          ? "جارٍ توليد بصمة الشهادة..."
          : "Generating credential hash...",

      awaitingWallet:
        locale === "ar"
          ? "بانتظار تأكيد المحفظة..."
          : "Waiting for wallet confirmation...",

      confirming:
        locale === "ar"
          ? "بانتظار تأكيد المعاملة على السلسلة..."
          : "Waiting for blockchain confirmation...",

      uploadTimeout:
        locale === "ar"
          ? "انتهت مهلة رفع الملف. تحقق من اتصالك بالإنترنت وحاول مرة أخرى."
          : "The file upload timed out. Check your internet connection and try again.",

      uploadFailed:
        locale === "ar"
          ? "تعذّر رفع المستند. حاول مرة أخرى لاحقًا."
          : "The document could not be uploaded. Please try again later.",

      authenticationFailed:
        locale === "ar"
          ? "فشلت مصادقة المحفظة. لم يتم رفع الملف."
          : "Wallet authentication failed. The file was not uploaded.",

      unauthorized:
        locale === "ar"
          ? "هذه المحفظة غير مخولة لإصدار الشهادات."
          : "This wallet is not authorized to issue credentials.",
    }),
    [locale],
  );

  function updateField<K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ) {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [key]: undefined,
      general: undefined,
    }));
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);

    setErrors((prev) => ({
      ...prev,
      document: undefined,
      general: undefined,
    }));
  }

  function validateForm(): FormErrors {
    const nextErrors: FormErrors = {};

    const trimmedAddress =
      formValues.studentAddress.trim();

    const trimmedStudentId =
      formValues.studentId.trim();

    const trimmedMajor =
      formValues.major.trim();

    const trimmedGpa =
      formValues.gpa.trim();

    const parsedGpa = Number(trimmedGpa);

    if (
      !trimmedAddress ||
      !isAddress(trimmedAddress)
    ) {
      nextErrors.studentAddress =
        copy.addressInvalid;
    }

    if (
      typeof formValues.studentId !== "string" &&
      typeof formValues.studentId !== "number"
    ) {
      nextErrors.studentId =
        copy.studentIdInvalidType;
    } else if (!trimmedStudentId) {
      nextErrors.studentId =
        copy.studentIdRequired;
    }

    if (typeof formValues.major !== "string") {
      nextErrors.major =
        copy.majorInvalidType;
    } else if (
      !trimmedMajor ||
      trimmedMajor.length < 2
    ) {
      nextErrors.major =
        copy.majorRequired;
    }

    if (
      !trimmedGpa ||
      Number.isNaN(parsedGpa) ||
      parsedGpa < 60 ||
      parsedGpa > 100
    ) {
      nextErrors.gpa =
        copy.gpaInvalid;
    }

    if (!selectedFile) {
      nextErrors.document =
        copy.fileRequired;
    } else {
      if (
        selectedFile.type !==
        "application/pdf"
      ) {
        nextErrors.document =
          copy.fileInvalidType;
      }

      if (
        selectedFile.size > MAX_FILE_SIZE
      ) {
        nextErrors.document =
          copy.fileTooLarge;
      }
    }

    if (!account || !isAddress(account)) {
      nextErrors.general =
        copy.accountRequired;
    }

    return nextErrors;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      state !== "idle" ||
      !canManage
    ) {
      return;
    }

    const validationErrors =
      validateForm();

    if (
      Object.keys(validationErrors).length > 0
    ) {
      setErrors(validationErrors);
      return;
    }

    if (!account || !isAddress(account)) {
      setErrors({
        general: copy.accountRequired,
      });
      return;
    }

    if (!selectedFile) {
      setErrors({
        document: copy.fileRequired,
      });
      return;
    }

    const studentAddress =
      formValues.studentAddress.trim();

    const studentId =
      formValues.studentId.trim();

    const major =
      formValues.major.trim();

    const gpa =
      formValues.gpa.trim();

    try {
      setErrors({});

      setState("authenticating");

      const ethereum =
        typeof window !== "undefined"
          ? window.ethereum
          : undefined;

      if (!ethereum) {
        throw new Error(
          "WALLET_NOT_AVAILABLE",
        );
      }

      const provider =
        new ethers.BrowserProvider(
          ethereum,
        );

      const signer =
        await provider.getSigner();

      const signerAddress =
        await signer.getAddress();

      if (
        signerAddress.toLowerCase() !==
        account.toLowerCase()
      ) {
        throw new Error(
          "ACCOUNT_MISMATCH",
        );
      }

      const uploadAuth =
        await createUploadAuth(
          signer,
        );

      setState("uploading");

      const uploadPayload =
        new FormData();

      uploadPayload.append(
        "file",
        selectedFile,
      );

      uploadPayload.append(
        "studentId",
        studentId,
      );

      uploadPayload.append(
        "address",
        uploadAuth.address,
      );

      uploadPayload.append(
        "timestamp",
        uploadAuth.timestamp.toString(),
      );

      uploadPayload.append(
        "signature",
        uploadAuth.signature,
      );

      const uploadController =
        new AbortController();

      const uploadTimeoutId =
        setTimeout(
          () =>
            uploadController.abort(),
          30000,
        );

      let uploadResponse: Response;

      try {
        uploadResponse =
          await fetch(
            "/api/pinata",
            {
              method: "POST",
              body: uploadPayload,
              signal:
                uploadController.signal,
            },
          );
      } catch (fetchError) {
        if (
          fetchError instanceof
            DOMException &&
          fetchError.name ===
            "AbortError"
        ) {
          throw new Error(
            "UPLOAD_TIMEOUT",
          );
        }

        throw new Error(
          "UPLOAD_NETWORK_ERROR",
        );
      } finally {
        clearTimeout(
          uploadTimeoutId,
        );
      }

      const uploadData =
        (await uploadResponse.json()) as {
          cid?: string;
          error?: string;
        };

      if (
        uploadResponse.status === 401
      ) {
        throw new Error(
          "AUTHENTICATION_FAILED",
        );
      }

      if (
        uploadResponse.status === 403
      ) {
        throw new Error(
          "UNAUTHORIZED",
        );
      }

      if (
        uploadResponse.status === 413
      ) {
        throw new Error(
          "FILE_TOO_LARGE",
        );
      }

      if (
        uploadResponse.status === 415
      ) {
        throw new Error(
          "INVALID_FILE",
        );
      }

      if (
        uploadResponse.status === 429
      ) {
        throw new Error(
          "RATE_LIMITED",
        );
      }

      if (
        !uploadResponse.ok ||
        !uploadData.cid
      ) {
        console.error(
          "Pinata upload error:",
          uploadData.error,
        );

        throw new Error(
          "UPLOAD_FAILED",
        );
      }

      setState("generating");

      const contract =
        await getWriteContract(
          account,
        );

      const certificateCounter =
        await contract.certificateCounter();

      const certHash =
        (await contract.generateCertificateHash(
          account,
          studentAddress,
          studentId,
          major,
          gpa,
          uploadData.cid,
          certificateCounter,
        )) as string;

      setState("awaiting_wallet");

      const tx =
        await contract.issueCertificate(
          certHash,
          studentAddress,
          studentId,
          major,
          gpa,
          uploadData.cid,
        );

      setState("confirming");

      await tx.wait();

      await onIssued();

      onSuccess(
        `${copy.success} ${copy.transaction}: ${shortValue(
          certHash,
          10,
          8,
        )}`,
      );

      setFormValues(
        EMPTY_FORM_VALUES,
      );

      setSelectedFile(null);

      setErrors({});

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }
    } catch (error) {
      let message =
        parseContractError(
          error,
          locale,
        );

      if (error instanceof Error) {
        switch (error.message) {
          case "WALLET_NOT_AVAILABLE":
            message =
              copy.accountRequired;
            break;

          case "ACCOUNT_MISMATCH":
            message =
              copy.accountRequired;
            break;

          case "AUTHENTICATION_FAILED":
            message =
              copy.authenticationFailed;
            break;

          case "UNAUTHORIZED":
            message =
              copy.unauthorized;
            break;

          case "FILE_TOO_LARGE":
            message =
              copy.fileTooLarge;
            break;

          case "INVALID_FILE":
            message =
              copy.fileInvalidType;
            break;

          case "RATE_LIMITED":
            message =
              locale === "ar"
                ? "تم تجاوز الحد المسموح من طلبات الرفع. حاول مرة أخرى لاحقاً."
                : "Too many upload requests. Please try again later.";
            break;

          case "UPLOAD_TIMEOUT":
            message =
              copy.uploadTimeout;
            break;

          case "UPLOAD_NETWORK_ERROR":
            message =
              copy.uploadFailed;
            break;

          case "UPLOAD_FAILED":
            message =
              copy.uploadFailed;
            break;

          default:
            break;
        }
      }

      setErrors((prev) => ({
        ...prev,
        general: message,
      }));
    } finally {
      setState("idle");
    }
  }

  const fieldsDisabled =
    !canManage ||
    state !== "idle";

  const statusText =
    state === "authenticating"
      ? copy.authenticating
      : state === "uploading"
        ? copy.uploading
        : state === "generating"
          ? copy.generating
          : state === "awaiting_wallet"
            ? copy.awaitingWallet
            : state === "confirming"
              ? copy.confirming
              : null;

  return (
    <div className="glass-card rounded-3xl p-6 md:p-8">
      <h3 className="font-serif text-xl font-semibold mb-6">
        {dict.formTitle}
      </h3>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
            {dict.labels.studentAddress}
          </label>

          <input
            name="studentAddress"
            type="text"
            className="elegant-input w-full text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={fieldsDisabled}
            value={
              formValues.studentAddress
            }
            onChange={(e) =>
              updateField(
                "studentAddress",
                e.target.value,
              )
            }
            required
          />

          {errors.studentAddress ? (
            <p className="mt-2 text-xs text-red-600">
              {errors.studentAddress}
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
            {dict.labels.studentId}
          </label>

          <input
            name="studentId"
            type="text"
            className="elegant-input w-full text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={fieldsDisabled}
            value={
              formValues.studentId
            }
            onChange={(e) =>
              updateField(
                "studentId",
                e.target.value,
              )
            }
            required
          />

          {errors.studentId ? (
            <p className="mt-2 text-xs text-red-600">
              {errors.studentId}
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
            {dict.labels.major}
          </label>

          <input
            name="major"
            type="text"
            className="elegant-input w-full text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={fieldsDisabled}
            value={formValues.major}
            onChange={(e) =>
              updateField(
                "major",
                e.target.value,
              )
            }
            required
          />

          {errors.major ? (
            <p className="mt-2 text-xs text-red-600">
              {errors.major}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
              {dict.labels.gpa}
            </label>

            <input
              name="gpa"
              type="text"
              inputMode="decimal"
              className="elegant-input w-full text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={fieldsDisabled}
              value={
                formValues.gpa
              }
              onChange={(e) =>
                updateField(
                  "gpa",
                  e.target.value,
                )
              }
              required
            />

            {errors.gpa ? (
              <p className="mt-2 text-xs text-red-600">
                {errors.gpa}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
              {dict.labels.document}
            </label>

            <input
              ref={fileInputRef}
              name="document"
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={fieldsDisabled}
            />

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={fieldsDisabled}
              className="w-full py-2 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
            >
              <UploadSimple className="w-4 h-4" />

              <span className="truncate">
                {selectedFile?.name ??
                  copy.selectFile}
              </span>
            </button>

            {errors.document ? (
              <p className="mt-2 text-xs text-red-600">
                {errors.document}
              </p>
            ) : null}
          </div>
        </div>

        {errors.general ? (
          <div className="rounded-2xl p-3 text-sm bg-red-50 text-red-600 border border-red-100">
            {errors.general}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={
            state !== "idle" ||
            !canManage
          }
          className={`mt-2 w-full py-3 rounded-xl font-medium transition-colors shadow-md flex items-center justify-center gap-2 text-white bg-brand-accent hover:bg-yellow-600 shadow-brand-accent/20 ${
            state !== "idle" ||
            !canManage
              ? "opacity-75"
              : ""
          }`}
        >
          {state !== "idle" ? (
            <SpinnerGap className="w-4 h-4 animate-spin" />
          ) : null}

          <span>
            {state !== "idle"
              ? dict.submitting
              : dict.submit}
          </span>
        </button>

        {statusText ? (
          <p className="text-xs text-gray-500 text-center">
            {statusText}
          </p>
        ) : null}
      </form>
    </div>
  );
}
