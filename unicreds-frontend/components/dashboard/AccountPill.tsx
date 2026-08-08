import { CaretDown } from "@phosphor-icons/react/dist/ssr";

interface AccountPillProps {
  wallet: string;
}

export default function AccountPill({ wallet }: AccountPillProps) {
  return (
    <div className="glass-panel px-5 py-2.5 rounded-full flex items-center gap-3 cursor-pointer hover:bg-white transition-colors">
      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-brand-accent to-yellow-600 flex-shrink-0" />
      <span className="text-sm font-medium text-gray-700">{wallet}</span>
      <CaretDown className="w-4 h-4 text-gray-400" />
    </div>
  );
}
