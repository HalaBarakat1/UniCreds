"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CubeTransparent,
  ShieldCheck,
  Buildings,
  GraduationCap,
  Crown,
} from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/lib/i18n-config";
import type { DashboardNav } from "@/types/dashboard";

interface SidebarProps {
  locale: Locale;
  nav: DashboardNav;
}

const NAV_ITEMS = [
  { id: "admin", icon: Crown },
  { id: "university", icon: Buildings },
  { id: "student", icon: GraduationCap },
  { id: "verify", icon: ShieldCheck },
] as const;

export default function Sidebar({ locale, nav }: SidebarProps) {
  const pathname = usePathname();
  const dir = locale === "ar" ? "rtl" : "ltr";

  function isActive(id: string) {
    return pathname === `/${locale}/${id}`;
  }

  return (
    <aside
      dir={dir}
      className="w-full lg:w-64 bg-gradient-beige flex flex-col lg:h-screen py-4 lg:py-8 px-4 lg:px-8 border-brand-beige/50 border-b lg:border-b-0 ltr:lg:border-r rtl:lg:border-l z-20 flex-shrink-0 transition-all duration-300"
    >
      <div className="flex flex-col gap-4 lg:gap-10">
        <Link href={`/${locale}`} className="flex items-center gap-3 w-full justify-start">
          <div className="w-10 h-10 rounded-xl bg-brand-dark flex items-center justify-center text-brand-accent shadow-lg flex-shrink-0">
            <CubeTransparent className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-brand-dark">UniCreds</h1>
        </Link>

        <nav className="flex flex-row lg:flex-col gap-2 lg:gap-4 w-full overflow-x-auto pb-1 lg:pb-0">
          {NAV_ITEMS.map(({ id, icon: Icon }) => {
            const active = isActive(id);
            return (
              <Link
                key={id}
                href={`/${locale}/${id}`}
                className={`min-w-fit whitespace-nowrap flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-300 ${
                  active
                    ? "bg-white/60 text-brand-accent shadow-sm"
                    : "text-gray-500 hover:bg-white/30 hover:text-brand-dark"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm lg:text-base">{nav[id]}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-4 lg:mt-auto w-full hidden lg:flex items-center justify-start gap-2 opacity-60">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
        <span className="text-xs font-semibold tracking-widest uppercase">{nav.network}</span>
      </div>
    </aside>
  );
}
