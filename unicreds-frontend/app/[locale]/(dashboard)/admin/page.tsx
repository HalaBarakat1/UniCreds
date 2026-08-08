import AdminDashboard from "@/components/dashboard/admin/AdminDashboard";
import { WalletGate } from "@/components/dashboard/web3provider";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n-config";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = (localeParam === "ar" ? "ar" : "en") as Locale;
  const dict = await getDictionary(locale);

  return (
    <WalletGate role="admin" locale={locale}>
      <AdminDashboard admin={dict.dashboard.admin} locale={locale} />
    </WalletGate>
  );
}
