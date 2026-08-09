import type { HeroPhrase } from "./portal";
import type { DashboardDictionary } from "./dashboard";

export interface Dictionary {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    phrases: HeroPhrase[];
  };
  branding: string;
  systemPortalLabel: string;
  accessPortal: string;
  portals: {
    verify: { title: string; description: string };
    university: { title: string; description: string };
    student: { title: string; description: string };
    admin: { title: string; description: string };
  };
  dashboard: DashboardDictionary;
}
