"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/types/routes";
import {
  ChevronRight,
  Menu,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

type SyncStatus = "synced" | "syncing" | "pending" | "error";

const PAGE_LABELS = [
  { href: ROUTES.dashboard, label: "Dashboard" },
  { href: ROUTES.pos.root, label: "POS Terminal" },
  { href: ROUTES.inventory.root, label: "Inventory" },
  { href: ROUTES.sales.root, label: "Sales" },
  { href: ROUTES.customers.root, label: "Customers" },
  { href: ROUTES.suppliers, label: "Suppliers" },
  { href: ROUTES.reports, label: "Reports" },
  { href: ROUTES.discounts, label: "Discounts" },
  { href: ROUTES.settings.root, label: "Settings" },
  { href: ROUTES.admin, label: "Admin" },
  { href: ROUTES.auth.login, label: "Login" },
];

const OFFICE_SIDEBAR_PATHS = [
  ROUTES.dashboard,
  ROUTES.inventory.root,
  ROUTES.sales.root,
  ROUTES.customers.root,
  ROUTES.suppliers,
  ROUTES.reports,
  ROUTES.discounts,
  ROUTES.settings.root,
  ROUTES.admin,
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSyncStatus(): SyncStatus {
  return "synced";
}

export function AppHeader() {
  const pathname = usePathname();
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [now, setNow] = useState(() => new Date());
  const syncStatus = getSyncStatus();
  const currentPage =
    PAGE_LABELS.find((link) => pathname?.startsWith(link.href))?.label ??
    "Workspace";
  const hasOfficeSidebar = OFFICE_SIDEBAR_PATHS.some((href) =>
    pathname?.startsWith(href),
  );

  useEffect(() => {
    const handleOnline = () => setOnline(navigator.onLine);
    const handleOffline = () => setOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  function handleToggleSidebar() {
    window.dispatchEvent(new Event("swiftpos:toggle-sidebar"));
  }

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-[70] flex h-14 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${
        hasOfficeSidebar ? "md:left-56" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ChevronRight
          size={16}
          className="shrink-0 text-on-surface-variant/50 dark:text-zinc-600"
        />
        <span className="truncate text-sm font-medium text-on-surface-variant dark:text-zinc-300">
          {currentPage}
        </span>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold capitalize text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          <RefreshCw
            size={13}
            className={syncStatus === "syncing" ? "animate-spin" : ""}
          />
          {syncStatus}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
            online
              ? "bg-[#004b1e] text-[#bbf7d0] dark:bg-green-900/50 dark:text-green-300"
              : "bg-error text-on-error dark:bg-red-900/50 dark:text-red-300"
          }`}
        >
          {online ? <Wifi size={13} /> : <WifiOff size={13} />}
          {online ? "Online" : "Offline"}
        </span>
        <span className="hidden min-w-[5.5rem] whitespace-nowrap text-right text-xs font-medium text-on-surface-variant dark:text-zinc-400 sm:block">
          <span className="block text-sm font-semibold text-on-surface dark:text-zinc-100">
            {formatTime(now)}
          </span>
          {formatDate(now)}
        </span>
      </div>
    </header>
  );
}
