"use client";

import { useConnectionStore } from "@/lib/store/connection";

export function ConnectionPill() {
  const online = useConnectionStore((state) => state.online);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        online
          ? "bg-[#004b1e] text-[#bbf7d0] dark:bg-green-900/50 dark:text-green-300"
          : "bg-error text-on-error dark:bg-red-900/50 dark:text-red-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          online ? "bg-[#4ade80]" : "bg-[#fca5a5]"
        }`}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}
