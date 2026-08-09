import type { ComponentType } from "react";

export interface PortalCardData {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}

export interface HeroPhrase {
  text: string;
  hasIcon?: boolean;
}
