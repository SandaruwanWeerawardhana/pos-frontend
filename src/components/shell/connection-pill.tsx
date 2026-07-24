"use client";

import { useConnectionStore } from "@/lib/store/connection";

export function ConnectionPill() {
  const online = useConnectionStore((state) => state.online);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        online
          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
          : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${online ? "bg-green-600" : "bg-red-600"}`}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}
