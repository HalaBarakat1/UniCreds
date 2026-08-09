import HeroPanel from "@/components/home/HeroPanel";
import PortalPanel from "@/components/home/PortalPanel";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n-config";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = (localeParam === "ar" ? "ar" : "en") as Locale;
  const dict = await getDictionary(locale);

  return (
    <div
      className={`relative flex flex-col h-screen w-full overflow-hidden ${
        locale === "ar" ? "lg:flex-row-reverse" : "lg:flex-row"
      }`}
    >
      <LanguageSwitcher currentLocale={locale} />
      <HeroPanel locale={locale} dict={dict} />
      <PortalPanel locale={locale} dict={dict} />
    </div>
  );
}
