"use client";

import { CheckCircle } from "@phosphor-icons/react";

interface SuccessToastProps {
  message: string;
}

export default function SuccessToast({ message }: SuccessToastProps) {
  return (
    <div className="fixed top-6 left-1/2 z-[100] w-[min(92vw,560px)] -translate-x-1/2">
      <div className="rounded-2xl border border-green-100 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm">
        <div className="flex items-start gap-3 text-green-700">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-50">
            <CheckCircle className="h-5 w-5" weight="fill" />
          </div>
          <p className="text-sm font-medium leading-6">{message}</p>
        </div>
      </div>
    </div>
  );
}
