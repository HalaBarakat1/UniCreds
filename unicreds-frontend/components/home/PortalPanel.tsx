import PortalGrid from "./PortalGrid";
import type { Locale } from "@/lib/i18n-config";
import type { Dictionary } from "@/types/dictionary";

interface PortalPanelProps {
  locale: Locale;
  dict: Dictionary;
}

export default function PortalPanel({ locale, dict }: PortalPanelProps) {
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div
      dir={dir}
      className="w-full lg:w-3/5 h-2/3 lg:h-full bg-white flex flex-col justify-center items-center p-8 lg:p-20 relative"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(#2C3333 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />

      <div className="w-full max-w-4xl z-10">
        <div className="text-center mb-16 hidden lg:block">
          <h2 className="text-xs font-bold tracking-[0.3em] uppercase text-gray-400 mb-2">
            {dict.systemPortalLabel}
          </h2>
          <div className="h-[1px] w-12 bg-brand-accent mx-auto" />
        </div>

        <PortalGrid locale={locale} dict={dict} />
      </div>
    </div>
  );
}
