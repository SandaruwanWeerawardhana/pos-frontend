"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/types/routes";

const TABS = [
  { href: ROUTES.auth.login, label: "Login" },
  { href: ROUTES.auth.register, label: "Register" },
];

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <nav className="flex rounded-full border border-outline-variant p-1 text-sm dark:border-zinc-800">
          {TABS.map((tab) => {
            const active = pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 rounded-full px-4 py-2 text-center transition-colors ${
                  active
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </main>
  );
}
