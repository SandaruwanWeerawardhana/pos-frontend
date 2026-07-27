"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/lib/types/routes";
import { useAuth } from "@/lib/hooks/use-auth";
import { RequireAuth } from "@/components/shell/require-auth";
import {
  Monitor,
  LayoutDashboard,
  Package,
  PackagePlus,
  DollarSign,
  Users,
  Truck,
  BarChart2,
  Tag,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard },
  { href: ROUTES.pos.root, label: "POS Terminal", icon: Monitor },
  { href: ROUTES.products, label: "Products", icon: PackagePlus },
  { href: ROUTES.inventory.root, label: "Inventory", icon: Package },
  { href: ROUTES.sales.root, label: "Sales", icon: DollarSign },
  { href: ROUTES.customers.root, label: "Customers", icon: Users },
  { href: ROUTES.suppliers, label: "Suppliers", icon: Truck },
  { href: ROUTES.reports, label: "Reports", icon: BarChart2 },
  { href: ROUTES.discounts, label: "Discounts", icon: Tag },
  { href: ROUTES.settings.root, label: "Settings", icon: Settings },
];

export default function OfficeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        {/* ── Sidebar ── */}
        <aside
          className={`fixed bottom-0 left-0 top-0 z-[80] flex h-dvh w-56 shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-950 md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Brand */}
          <div className="flex h-14 items-center gap-2.5 border-b border-outline-variant px-4 dark:border-zinc-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-on-primary text-xs font-bold select-none">
              V
            </span>
            <span className="text-sm font-semibold text-on-surface dark:text-zinc-100">
              Velocity POS
            </span>
          </div>

          {/* Nav */}
          <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50 dark:text-zinc-600">
              Navigation
            </p>
            {NAV_ITEMS.map((item) => {
              const active = pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  }`}
                >
                  <Icon size={16} className={active ? "opacity-90" : "opacity-60"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-outline-variant p-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant transition-all duration-150 hover:bg-error-container/20 hover:text-error dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            >
              <LogOut size={16} className="opacity-60" />
              Logout
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-surface dark:bg-zinc-950">
          <div className="mx-auto max-w-5xl p-6">{children}</div>
        </main>
      </div>
    </RequireAuth>
  );
}
