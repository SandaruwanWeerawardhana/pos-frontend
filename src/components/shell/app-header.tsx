"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectionPill } from "./connection-pill";
import { ThemeToggle } from "./theme-toggle";
import { ROUTES } from "@/lib/types/routes";

const NAV_LINKS = [
  { href: ROUTES.pos.root, label: "POS" },
  { href: ROUTES.admin, label: "Admin" },
  { href: ROUTES.auth.login, label: "Login" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-6">
        <span className="text-lg font-semibold text-on-surface dark:text-zinc-50">POS</span>
        <nav className="flex gap-4 text-sm text-on-surface-variant dark:text-zinc-400">
          {NAV_LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "font-medium text-primary dark:text-blue-400" : "hover:text-on-surface dark:hover:text-zinc-200 transition-colors"}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <ConnectionPill />
      </div>
    </header>
  );
}
