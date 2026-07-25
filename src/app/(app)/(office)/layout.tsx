"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/types/routes";
import { RequireAuth } from "@/components/shell/require-auth";

const NAV_ITEMS = [
  { href: ROUTES.pos.root, label: "POS Terminal" },
  { href: ROUTES.dashboard, label: "Dashboard" },
  { href: ROUTES.inventory.root, label: "Inventory" },
  { href: ROUTES.sales.root, label: "Sales" },
  { href: ROUTES.customers.root, label: "Customers" },
  { href: ROUTES.suppliers, label: "Suppliers" },
  { href: ROUTES.reports, label: "Reports" },
  { href: ROUTES.discounts, label: "Discounts" },
  { href: ROUTES.settings.root, label: "Settings" },
];

export default function OfficeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <RequireAuth>
      <div className="flex flex-1">
        <aside className="w-48 shrink-0 border-r border-outline-variant p-4 dark:border-zinc-800">
        <nav className="flex flex-col gap-1 text-sm">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 ${
                  active
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        </aside>
        <div className="flex-1 p-4">{children}</div>
      </div>
    </RequireAuth>
  );
}
