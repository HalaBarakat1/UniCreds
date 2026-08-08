import StudentDashboard from "@/components/dashboard/student/StudentDashboard";
import { WalletGate } from "@/components/dashboard/web3provider";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n-config";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = (localeParam === "ar" ? "ar" : "en") as Locale;
  const dict = await getDictionary(locale);

  return (
    <WalletGate role="student" locale={locale}>
      <StudentDashboard student={dict.dashboard.student} locale={locale} />
    </WalletGate>
  );
}
