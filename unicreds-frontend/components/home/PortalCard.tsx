import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { PortalCardData } from "@/types/portal";

interface PortalCardProps {
  data: PortalCardData;
  accessLabel: string;
}

export default function PortalCard({ data, accessLabel }: PortalCardProps) {
  const Icon = data.icon;

  return (
    <Link
      href={data.href}
      className="glass-card rounded-2xl p-8 text-start group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent w-full relative overflow-hidden block"
    >
      <span className="absolute top-0 start-0 w-1 h-full bg-transparent transition-colors duration-300 group-hover:bg-brand-accent" />

      <span className="icon-wrapper w-14 h-14 rounded-full bg-brand-beige text-brand-dark flex items-center justify-center text-2xl mb-6 shadow-sm">
        <Icon className="w-7 h-7" />
      </span>

      <h3 className="font-serif text-xl font-semibold mb-3 text-gray-900 group-hover:text-brand-accent transition-colors">
        {data.title}
      </h3>

      <p className="text-sm text-gray-500 leading-relaxed">
        {data.description}
      </p>

      <span className="mt-6 flex items-center text-xs font-semibold tracking-wide text-brand-accent uppercase opacity-0 transform transition-all duration-300 ltr:-translate-x-2 rtl:translate-x-2 group-hover:opacity-100 group-hover:translate-x-0">
        {accessLabel}
        <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180" />
      </span>
    </Link>
  );
}
