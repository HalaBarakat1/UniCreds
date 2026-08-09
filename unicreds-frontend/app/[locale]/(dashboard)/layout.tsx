import Sidebar from "@/components/dashboard/Sidebar";
import WalletAccountPill from "@/components/dashboard/WalletAccountPill";
import { Web3Provider } from "@/components/dashboard/web3provider";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n-config";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = (localeParam === "ar" ? "ar" : "en") as Locale;
  const dict = await getDictionary(locale);
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <Web3Provider>
      <div
        className={`min-h-screen w-full flex flex-col lg:overflow-hidden bg-gray-50 ${
          locale === "ar" ? "lg:flex-row-reverse" : "lg:flex-row"
        }`}
      >
        <Sidebar locale={locale} nav={dict.dashboard.nav} />

        <main dir={dir} className="flex-1 min-w-0 relative lg:h-screen lg:overflow-y-auto">
          <div className="absolute inset-0 bg-pattern pointer-events-none" />

          <header className="w-full px-4 py-4 md:px-8 md:py-6 lg:px-10 lg:py-8 flex justify-end items-center sticky top-0 z-10 bg-gradient-to-b from-gray-50 via-gray-50/95 to-transparent backdrop-blur-sm">
            <WalletAccountPill fallback={dict.dashboard.header.wallet} />
          </header>

          <div className="relative px-4 md:px-8 lg:px-16 pb-12 md:pb-16 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </Web3Provider>
  );
}
