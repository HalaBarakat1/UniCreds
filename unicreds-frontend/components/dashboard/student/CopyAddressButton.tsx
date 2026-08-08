"use client";

import { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react/dist/ssr";

interface CopyAddressButtonProps {
  value: string;
  label: string;
}

export default function CopyAddressButton({
  value,
  label,
}: CopyAddressButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked in some browser contexts; fail silently.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={label}
      aria-label={label}
      className="hover:text-brand-accent transition-colors"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}
