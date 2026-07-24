"use client";

import { useConnectionStore } from "@/lib/store/connection";

export function ConnectionPill() {
  const online = useConnectionStore((state) => state.online);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        online
          ? "bg-tertiary-container/20 text-on-tertiary-container dark:bg-green-900/40 dark:text-green-300"
          : "bg-error-container text-on-error-container dark:bg-red-900/40 dark:text-red-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${online ? "bg-on-tertiary-container" : "bg-error"}`}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}
