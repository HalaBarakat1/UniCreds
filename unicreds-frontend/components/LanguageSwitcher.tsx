"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Translate, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { locales, type Locale } from "@/lib/i18n-config";

interface LanguageSwitcherProps {
  currentLocale: Locale;
}

const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

function stripLocaleFromPath(pathname: string, locale: Locale): string {
  const prefix = `/${locale}`;
  if (pathname === prefix) return "";
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  return pathname;
}

export default function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dir = currentLocale === "ar" ? "rtl" : "ltr";
  const restOfPath = stripLocaleFromPath(pathname, currentLocale);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} dir={dir} className="fixed top-6 end-6 z-50">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-2 rounded-full border border-brand-accent/30 bg-white/80 backdrop-blur px-4 py-2 text-xs font-semibold tracking-wide text-brand-dark shadow-sm transition-all duration-300 hover:border-brand-accent hover:text-brand-accent hover:shadow-md"
      >
        <Translate className="w-4 h-4" />
        <span>{LANGUAGE_NAMES[currentLocale]}</span>
        <CaretDown
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute end-0 mt-2 w-36 overflow-hidden rounded-xl border border-brand-accent/20 bg-white/95 backdrop-blur shadow-lg"
        >
          {locales.map((locale) => (
            <Link
              key={locale}
              href={`/${locale}${restOfPath}`}
              onClick={() => setIsOpen(false)}
              role="option"
              aria-selected={locale === currentLocale}
              className={`block px-4 py-2.5 text-sm transition-colors ${
                locale === currentLocale
                  ? "bg-brand-beige/60 text-brand-dark font-semibold"
                  : "text-gray-600 hover:bg-brand-beige/40 hover:text-brand-dark"
              }`}
            >
              {LANGUAGE_NAMES[locale]}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
