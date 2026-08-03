"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/types/routes";
import { RequireAuth } from "@/components/shell/require-auth";
import { RequireOffice } from "@/components/shell/require-office";
import {
  BarChart2,
  Bell,
  Boxes,
  ChevronDown,
  DollarSign,
  KeyRound,
  LayoutDashboard,
  Monitor,
  PackagePlus,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Truck,
  UserCog,
  Users,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Monitor;
  /* Rendered as a collapsible section instead of a plain link. */
  children?: NavItem[];
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
    label: "Administration",
    items: [
      {
        href: ROUTES.users.root,
        label: "User Management",
        icon: ShieldCheck,
        children: [
          { href: ROUTES.users.root, label: "Users", icon: Users },
          {
            href: ROUTES.users.permissions,
            label: "Group Permissions",
            icon: KeyRound,
          },
        ],
      },
      { href: ROUTES.profile, label: "My profile", icon: UserCog },
    ],
  },
  {
    label: "Insight & setup",
    items: [
      { href: ROUTES.reports, label: "Reports", icon: BarChart2 },
      { href: ROUTES.settings.root, label: "Settings", icon: Settings },
    ],
  },
];


function flattenItems(items: NavItem[]): NavItem[] {
  return items.flatMap((item) =>
    item.children ? [item, ...item.children] : [item],
  );
}

function findActiveHref(pathname: string | null): string | null {
  if (!pathname) return null;
  const matches = flattenItems(NAV_GROUPS.flatMap((group) => group.items))
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Only holds sections the user has explicitly toggled; anything absent falls
  // back to "open when it contains the active route".
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const activeHref = findActiveHref(pathname);

  useEffect(() => {
    const toggleSidebar = () => setSidebarOpen((open) => !open);
    window.addEventListener("swiftpos:toggle-sidebar", toggleSidebar);
    return () =>
      window.removeEventListener("swiftpos:toggle-sidebar", toggleSidebar);
  }, []);

  return (
    <RequireAuth>
      <RequireOffice>
      <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-1 overflow-hidden md:pl-64">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="animate-fade-in fixed inset-0 z-[75] bg-black/30 md:hidden"
          />
        )}

        <aside
          aria-label="Main navigation"
          className={`fixed bottom-0 left-0 top-0 z-[80] flex h-dvh w-64 shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest transition-transform duration-[var(--duration-slow)] ease-[var(--ease-decelerate)] md:translate-x-0 dark:border-zinc-800 dark:bg-zinc-950 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-outline-variant px-4 dark:border-zinc-800">
            <span className="flex h-7 w-7 select-none items-center justify-center rounded-lg bg-gradient-to-r from-primary to-secondary">
              <Image src="/logo.png" alt="PSI POS" width={28} height={28} className="rounded-lg" />
            </span>
            <span className="font-display text-sm font-semibold text-on-surface dark:text-zinc-100">
              PSI POS
            </span>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-0.5">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50 dark:text-zinc-600">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;

                  if (item.children) {
                    const sectionActive = item.children.some(
                      (child) => activeHref === child.href,
                    );
                    const open = openSections[item.label] ?? sectionActive;
                    return (
                      <div key={item.label} className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() =>
                            setOpenSections((sections) => ({
                              ...sections,
                              [item.label]: !open,
                            }))
                          }
                          className={`group flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            sectionActive
                              ? "bg-gradient-to-r from-primary to-secondary text-on-primary shadow-sm"
                              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          }`}
                        >
                          <Icon
                            size={16}
                            aria-hidden
                            className={`transition-[opacity,transform] duration-[var(--duration-base)] ease-[var(--ease-spring)] group-hover:scale-110 ${
                              sectionActive ? "opacity-90" : "opacity-60"
                            }`}
                          />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown
                            size={14}
                            aria-hidden
                            className={`transition-transform duration-[var(--duration-base)] ease-[var(--ease-standard)] ${
                              open ? "rotate-180" : ""
                            } ${sectionActive ? "opacity-90" : "opacity-60"}`}
                          />
                        </button>

                        {open && (
                          <div className="animate-fade-in flex flex-col gap-0.5 rounded-lg bg-surface-container-low py-1 dark:bg-zinc-900">
                            {item.children.map((child) => {
                              const childActive = activeHref === child.href;
                              const ChildIcon = child.icon;
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  aria-current={childActive ? "page" : undefined}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`group flex min-h-9 items-center gap-2.5 rounded-lg py-1 pl-8 pr-3 text-sm transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                                    childActive
                                      ? "bg-surface-container font-medium text-primary dark:bg-zinc-800 dark:text-blue-400"
                                      : "text-on-surface-variant hover:translate-x-0.5 hover:bg-surface-container hover:text-on-surface dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                  }`}
                                >
                                  <ChildIcon
                                    size={15}
                                    aria-hidden
                                    className="opacity-70 transition-transform duration-[var(--duration-base)] ease-[var(--ease-spring)] group-hover:scale-110"
                                  />
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const active = activeHref === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className={`group flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        active
                          ? "bg-gradient-to-r from-primary to-secondary text-on-primary shadow-sm"
                          : "text-on-surface-variant hover:translate-x-0.5 hover:bg-surface-container hover:text-on-surface dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      }`}
                    >
                      <Icon
                        size={16}
                        aria-hidden
                        className={`transition-[opacity,transform] duration-[var(--duration-base)] ease-[var(--ease-spring)] group-hover:scale-110 ${
                          active ? "opacity-90" : "opacity-60"
                        }`}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto scroll-smooth bg-surface dark:bg-zinc-950">
          <div
            key={pathname}
            className="animate-fade-in-up mx-auto max-w-6xl p-4 sm:p-6"
          >
            {children}
          </div>
        </main>
      </div>
      </RequireOffice>
    </RequireAuth>
  );
}
