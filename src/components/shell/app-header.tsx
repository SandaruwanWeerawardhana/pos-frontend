"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectionPill } from "./connection-pill";
import { ROUTES } from "@/lib/types/routes";

const NAV_LINKS = [
  { href: ROUTES.pos.root, label: "POS" },
  { href: ROUTES.admin, label: "Admin" },
  { href: ROUTES.auth.login, label: "Login" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-outline-variant px-4 dark:border-zinc-800">
      <div className="flex items-center gap-6">
        <span className="text-lg font-semibold text-on-surface">POS</span>
        <nav className="flex gap-4 text-sm text-on-surface-variant">
          {NAV_LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "font-medium text-primary" : ""}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <ConnectionPill />
    </header>
  );
}
