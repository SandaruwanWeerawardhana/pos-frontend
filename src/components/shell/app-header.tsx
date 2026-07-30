"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { NotificationPanel } from "@/components/shell/notification-panel";
import { useAuth } from "@/lib/hooks/use-auth";
import { useSyncStatus } from "@/lib/sync/use-sync-status";
import { ROUTES } from "@/lib/types/routes";
import {
  ChevronRight,
  KeyRound,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  User as UserIcon,
  Wifi,
  WifiOff,
} from "lucide-react";

const PAGE_LABELS = [
  { href: ROUTES.dashboard, label: "Dashboard" },
  { href: ROUTES.pos.root, label: "POS Terminal" },
  { href: ROUTES.products, label: "Product Management" },
  { href: ROUTES.inventory.root, label: "Inventory" },
  { href: ROUTES.purchases.root, label: "Purchases" },
  { href: ROUTES.sales.root, label: "Sales" },
  { href: ROUTES.customers.root, label: "Customers" },
  { href: ROUTES.suppliers, label: "Suppliers" },
  { href: ROUTES.reports, label: "Reports" },
  { href: ROUTES.discounts, label: "Discounts" },
  { href: ROUTES.users, label: "Users & Roles" },
  { href: ROUTES.settings.root, label: "Settings" },
  { href: ROUTES.profile, label: "My Profile" },
  { href: ROUTES.admin, label: "Admin" },
  { href: ROUTES.auth.login, label: "Login" },
];

const OFFICE_SIDEBAR_PATHS = [
  ROUTES.dashboard,
  ROUTES.products,
  ROUTES.inventory.root,
  ROUTES.purchases.root,
  ROUTES.sales.root,
  ROUTES.customers.root,
  ROUTES.suppliers,
  ROUTES.reports,
  ROUTES.discounts,
  ROUTES.users,
  ROUTES.settings.root,
  ROUTES.profile,
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

function openCommandPalette() {
  // The palette owns the Ctrl/Cmd+K listener; synthesising the same event
  // keeps one source of truth for "open search" rather than lifting the
  // palette's open state into a store purely for this button.
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { pendingCount, conflictCount } = useSyncStatus();
  const [online, setOnline] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentPage =
    PAGE_LABELS.find((link) => pathname?.startsWith(link.href))?.label ??
    "Workspace";
  const hasOfficeSidebar = OFFICE_SIDEBAR_PATHS.some((href) =>
    pathname?.startsWith(href),
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const syncTimerId = window.setTimeout(() => setOnline(navigator.onLine), 0);
    return () => {
      window.clearTimeout(syncTimerId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    const syncTimerId = window.setTimeout(updateClock, 0);
    const timerId = window.setInterval(updateClock, 1000);
    return () => {
      window.clearTimeout(syncTimerId);
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  function handleToggleSidebar() {
    window.dispatchEvent(new Event("swiftpos:toggle-sidebar"));
  }

  function handleLogout() {
    logout();
    setMenuOpen(false);
    router.replace(ROUTES.auth.login);
  }

  let syncLabel = "Synced";
  let syncClass =
    "bg-[#004b1e] text-[#bbf7d0] dark:bg-green-900/50 dark:text-green-300";
  if (conflictCount > 0) {
    syncLabel = `${conflictCount} conflict${conflictCount === 1 ? "" : "s"}`;
    syncClass = "bg-error text-on-error";
  } else if (pendingCount > 0) {
    syncLabel = `${pendingCount} pending`;
    syncClass =
      "bg-amber-500/15 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-[70] flex h-14 shrink-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-lowest px-3 shadow-sm sm:px-4 dark:border-zinc-800 dark:bg-zinc-950 ${
        hasOfficeSidebar ? "md:left-56" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Toggle sidebar"
          onClick={handleToggleSidebar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 md:hidden"
        >
          <Menu size={18} />
        </button>
        <ChevronRight
          size={16}
          aria-hidden
          className="hidden shrink-0 text-on-surface-variant/50 sm:block dark:text-zinc-600"
        />
        <span className="truncate text-sm font-medium text-on-surface-variant dark:text-zinc-300">
          {currentPage}
        </span>

        <button
          type="button"
          onClick={openCommandPalette}
          className="ml-2 hidden min-w-0 max-w-xs flex-1 items-center gap-2 rounded-lg border border-outline-variant px-3 py-1.5 text-xs text-on-surface-variant transition-colors hover:border-primary/40 hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:flex dark:border-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-800"
        >
          <Search size={13} aria-hidden />
          <span className="flex-1 text-left">Search everything…</span>
          <kbd className="rounded border border-outline-variant px-1 text-[10px] dark:border-zinc-700">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Search"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Search size={15} />
        </button>

        {/* Cloud sync state, kept separate from raw connectivity: online with a
            backlog is a different situation from being offline. */}
        <span
          title={`Cloud sync: ${syncLabel}`}
          className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${syncClass}`}
        >
          {(pendingCount > 0 || conflictCount > 0) && (
            <RefreshCw size={12} aria-hidden />
          )}
          {syncLabel}
        </span>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
            online
              ? "bg-[#004b1e] text-[#bbf7d0] dark:bg-green-900/50 dark:text-green-300"
              : "bg-error text-on-error dark:bg-red-900/50 dark:text-red-300"
          }`}
        >
          {online ? <Wifi size={13} aria-hidden /> : <WifiOff size={13} aria-hidden />}
          <span className="hidden sm:inline">{online ? "Online" : "Offline"}</span>
        </span>

        <NotificationPanel />
        <ThemeToggle />

        {isAuthenticated && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Account menu"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {(user?.name ?? "?").charAt(0).toUpperCase()}
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-10 z-[120] w-56 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="border-b border-outline-variant px-4 py-3 dark:border-zinc-800">
                  <p className="truncate text-sm font-semibold text-on-surface dark:text-zinc-50">
                    {user?.name}
                  </p>
                  <p className="truncate text-xs text-on-surface-variant dark:text-zinc-400">
                    {user?.email}
                  </p>
                </div>
                <Link
                  href={ROUTES.profile}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-on-surface transition-colors hover:bg-surface-container dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <UserIcon size={15} className="opacity-60" aria-hidden />
                  My profile
                </Link>
                <Link
                  href={`${ROUTES.profile}#password`}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-on-surface transition-colors hover:bg-surface-container dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <KeyRound size={15} className="opacity-60" aria-hidden />
                  Change password
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 border-t border-outline-variant px-4 py-2.5 text-sm text-error transition-colors hover:bg-error-container/20 dark:border-zinc-800 dark:hover:bg-red-950/30"
                >
                  <LogOut size={15} className="opacity-70" aria-hidden />
                  Log out
                </button>
              </div>
            )}
          </div>
        )}

        <span className="hidden min-w-[5.5rem] whitespace-nowrap text-right text-xs font-medium text-on-surface-variant xl:block dark:text-zinc-400">
          <span className="block text-sm font-semibold text-on-surface dark:text-zinc-100">
            {now ? formatTime(now) : "--:--"}
          </span>
          {now ? formatDate(now) : "..."}
        </span>
      </div>
    </header>
  );
}
