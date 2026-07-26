"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — render only after mount
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-lg" aria-hidden />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      id="theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-all duration-150 hover:border-primary/40 hover:bg-surface-container hover:text-primary dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-blue-500/40 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
