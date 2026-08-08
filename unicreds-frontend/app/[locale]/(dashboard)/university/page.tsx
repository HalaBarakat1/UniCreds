import UniversityDashboard from "@/components/dashboard/university/UniversityDashboard";
import { WalletGate } from "@/components/dashboard/web3provider";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n-config";

export default async function UniversityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = (localeParam === "ar" ? "ar" : "en") as Locale;
  const dict = await getDictionary(locale);

  return (
    <WalletGate role="university" locale={locale}>
      <UniversityDashboard university={dict.dashboard.university} locale={locale} />
    </WalletGate>
  );
}
