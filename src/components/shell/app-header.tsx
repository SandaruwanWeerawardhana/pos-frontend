import Link from "next/link";
import { ConnectionPill } from "./connection-pill";

export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
      <div className="flex items-center gap-6">
        <span className="text-lg font-semibold">POS</span>
        <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/pos">POS</Link>
          <Link href="/admin">Admin</Link>
          <Link href="/login">Login</Link>
        </nav>
      </div>
      <ConnectionPill />
    </header>
  );
}
