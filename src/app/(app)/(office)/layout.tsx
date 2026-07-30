"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/lib/types/routes";
import { useAuth } from "@/lib/hooks/use-auth";
import { RequireAuth } from "@/components/shell/require-auth";
import {
  BarChart2,
  Bell,
  Boxes,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Monitor,
  PackagePlus,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Truck,
  Users,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Monitor;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Grouped so the sidebar stays navigable as the module count grows — a flat
// list of fifteen links is hard to scan on a till screen.
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operate",
    items: [
      { href: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard },
      { href: ROUTES.pos.root, label: "POS Terminal", icon: Monitor },
      { href: ROUTES.sales.root, label: "Sales", icon: DollarSign },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: ROUTES.products, label: "Products", icon: PackagePlus },
      { href: ROUTES.inventory.root, label: "Inventory", icon: Boxes },
      { href: ROUTES.inventory.alerts, label: "Stock alerts", icon: Bell },
      { href: ROUTES.discounts, label: "Promotions", icon: Tag },
    ],
  },
  {
    label: "Supply",
    items: [
      { href: ROUTES.purchases.root, label: "Purchases", icon: ShoppingCart },
      { href: ROUTES.suppliers, label: "Suppliers", icon: Truck },
    ],
  },
  {
    label: "People & insight",
    items: [
      { href: ROUTES.customers.root, label: "Customers", icon: Users },
      { href: ROUTES.reports, label: "Reports", icon: BarChart2 },
      { href: ROUTES.users, label: "Users & roles", icon: ShieldCheck },
      { href: ROUTES.settings.root, label: "Settings", icon: Settings },
    ],
  },
];

// Longest-prefix match, so /inventory/alerts highlights "Stock alerts" rather
// than also lighting up the parent "Inventory" link.
function findActiveHref(pathname: string | null): string | null {
  if (!pathname) return null;
  const matches = NAV_GROUPS.flatMap((group) => group.items)
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`));
  if (matches.length === 0) return null;
  return matches.reduce((longest, href) =>
    href.length > longest.length ? href : longest,
  );
}

export default function OfficeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeHref = findActiveHref(pathname);

  useEffect(() => {
    const toggleSidebar = () => setSidebarOpen((open) => !open);
    window.addEventListener("swiftpos:toggle-sidebar", toggleSidebar);
    return () =>
      window.removeEventListener("swiftpos:toggle-sidebar", toggleSidebar);
  }, []);

  function handleLogout() {
    logout();
    router.replace(ROUTES.auth.login);
  }

  return (
    <RequireAuth>
      <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-1 overflow-hidden md:pl-56">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-[75] bg-black/30 md:hidden"
          />
        )}

        <aside
          aria-label="Main navigation"
          className={`fixed bottom-0 left-0 top-0 z-[80] flex h-dvh w-56 shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest transition-transform duration-200 md:translate-x-0 dark:border-zinc-800 dark:bg-zinc-950 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-outline-variant px-4 dark:border-zinc-800">
            <span className="flex h-7 w-7 select-none items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
              V
            </span>
            <span className="text-sm font-semibold text-on-surface dark:text-zinc-100">
              Velocity POS
            </span>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-0.5">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50 dark:text-zinc-600">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const active = activeHref === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        active
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      }`}
                    >
                      <Icon
                        size={16}
                        aria-hidden
                        className={active ? "opacity-90" : "opacity-60"}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="shrink-0 border-t border-outline-variant p-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-on-surface-variant transition-all duration-150 hover:bg-error-container/20 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            >
              <LogOut size={16} className="opacity-60" aria-hidden />
              Logout
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto bg-surface dark:bg-zinc-950">
          <div className="mx-auto max-w-6xl p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </RequireAuth>
  );
}
