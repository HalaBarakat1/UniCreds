"use client";

import { CaretDown, Wallet } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useWeb3, type PortalRole } from "./web3provider";

interface WalletAccountPillProps {
  fallback: string;
}

function roleFromPath(pathname: string): PortalRole | null {
  if (pathname.includes("/university")) return "university";
  if (pathname.includes("/admin")) return "admin";
  if (pathname.includes("/student")) return "student";
  return null;
}

export default function WalletAccountPill({ fallback }: WalletAccountPillProps) {
  const pathname = usePathname();
  const { states, disconnectWallet, shortenAddress } = useWeb3();
  const role = roleFromPath(pathname ?? "");

  if (!role) return null;

  const account = states[role].account;

  return (
    <button
      type="button"
      onClick={account ? () => disconnectWallet(role) : undefined}
      className="glass-panel max-w-full px-4 md:px-5 py-2.5 rounded-full flex items-center gap-2 md:gap-3 hover:bg-white transition-colors"
      title={account ? "Disconnect wallet" : "Wallet not connected"}
    >
      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-brand-accent to-yellow-600 flex items-center justify-center text-white flex-shrink-0">
        <Wallet className="w-3.5 h-3.5" />
      </div>
      <span className="text-sm font-medium text-gray-700 truncate max-w-[9rem] sm:max-w-none">
        {account ? shortenAddress(account) : fallback}
      </span>
      <CaretDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </button>
  );
}
