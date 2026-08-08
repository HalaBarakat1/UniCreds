import { CubeTransparent } from "@phosphor-icons/react/dist/ssr";
import AnimatedHero from "./AnimatedHero";
import type { Locale } from "@/lib/i18n-config";
import type { Dictionary } from "@/types/dictionary";

interface HeroPanelProps {
  locale: Locale;
  dict: Dictionary;
}

export default function HeroPanel({ locale, dict }: HeroPanelProps) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const isArabic = locale === "ar";

  return (
    <div
      dir={dir}
      className={`w-full lg:w-2/5 h-1/3 lg:h-full flex flex-col justify-center items-start p-10 lg:p-16 relative overflow-hidden z-10 ${
        isArabic
          ? "bg-gradient-to-bl from-white via-[#faf8f5] to-brand-beige shadow-[-10px_0_30px_rgba(0,0,0,0.03)]"
          : "bg-gradient-to-br from-white via-[#faf8f5] to-brand-beige shadow-[10px_0_30px_rgba(0,0,0,0.03)]"
      }`}
    >
      <div
        aria-hidden="true"
        className={`absolute top-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-50 transform -translate-y-1/2 ${
          isArabic ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2"
        }`}
      />
      <div
        aria-hidden="true"
        className={`absolute bottom-0 w-96 h-96 bg-brand-accent rounded-full mix-blend-multiply filter blur-[100px] opacity-10 transform translate-y-1/3 ${
          isArabic ? "left-0 -translate-x-1/3" : "right-0 translate-x-1/3"
        }`}
      />

      <div className="relative z-20 min-h-[150px] flex items-center">
        <AnimatedHero phrases={dict.hero.phrases} />
      </div>

      <div className="absolute bottom-10 start-10 lg:start-16 flex items-center gap-3 opacity-60">
        <CubeTransparent className="w-6 h-6" />
        <span className="text-sm tracking-widest font-semibold uppercase">
          {dict.branding}
        </span>
      </div>
    </div>
  );
}
