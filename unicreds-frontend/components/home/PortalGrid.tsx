import {
  ShieldCheck,
  Buildings,
  GraduationCap,
  Crown,
} from "@phosphor-icons/react/dist/ssr";
import PortalCard from "./PortalCard";
import type { Locale } from "@/lib/i18n-config";
import type { Dictionary } from "@/types/dictionary";
import type { PortalCardData } from "@/types/portal";

interface PortalGridProps {
  locale: Locale;
  dict: Dictionary;
}

export default function PortalGrid({ locale, dict }: PortalGridProps) {
  const portals: PortalCardData[] = [
    {
      id: "admin",
      icon: Crown,
      title: dict.portals.admin.title,
      description: dict.portals.admin.description,
      href: `/${locale}/admin`,
    },
    {
      id: "university",
      icon: Buildings,
      title: dict.portals.university.title,
      description: dict.portals.university.description,
      href: `/${locale}/university`,
    },
    {
      id: "student",
      icon: GraduationCap,
      title: dict.portals.student.title,
      description: dict.portals.student.description,
      href: `/${locale}/student`,
    },
    {
      id: "verify",
      icon: ShieldCheck,
      title: dict.portals.verify.title,
      description: dict.portals.verify.description,
      href: `/${locale}/verify`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
      {portals.map((portal) => (
        <PortalCard key={portal.id} data={portal} accessLabel={dict.accessPortal} />
      ))}
    </div>
  );
}
