import VerifyPanel from "@/components/dashboard/verify/VerifyPanel";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n-config";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = (localeParam === "ar" ? "ar" : "en") as Locale;
  const dict = await getDictionary(locale);

  return (
    <section>
      <div className="mb-12 text-center md:text-start">
        <h2 className="font-serif text-3xl md:text-5xl text-brand-dark mb-4">{dict.dashboard.verify.title}</h2>
        <p className="text-gray-500 max-w-2xl text-lg mx-auto md:mx-0">{dict.dashboard.verify.subtitle}</p>
      </div>

      <VerifyPanel dict={dict.dashboard.verify} locale={locale} />
    </section>
  );
}
