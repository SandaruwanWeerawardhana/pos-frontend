import Link from "next/link";
import { ROUTES } from "@/lib/types/routes";

const NAV_ITEMS = [
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
  return (
    <div className="flex flex-1">
      <aside className="w-48 shrink-0 border-r border-zinc-200 p-4 dark:border-zinc-800">
        <nav className="flex flex-col gap-1 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}
