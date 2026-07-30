"use client";

import Link from "next/link";
import { ClipboardList, Moon, Printer, Trash2 } from "lucide-react";
import { ROUTES } from "@/lib/types/routes";

interface QuickActionsProps {
  onHold: () => void;
  onClear: () => void;
  onPrintLast: () => void;
  disabled: boolean;
}

// Till-side shortcuts. Keyboard equivalents are shown so cashiers on a
// physical keyboard can learn them without a separate cheat sheet.
export function QuickActions({
  onHold,
  onClear,
  onPrintLast,
  disabled,
}: Readonly<QuickActionsProps>) {
  return (
    <div className="flex flex-wrap justify-center gap-2 pb-16 lg:pb-0">
      <ActionButton
        icon={<ClipboardList size={18} />}
        label="Hold / Recall"
        hint="F4"
        onClick={onHold}
      />
      <ActionButton
        icon={<Printer size={18} />}
        label="Reprint receipt"
        onClick={onPrintLast}
      />
      <ActionButton
        icon={<Trash2 size={18} />}
        label="Clear cart"
        hint="F8"
        onClick={onClear}
        disabled={disabled}
        danger
      />
      <Link
        href={ROUTES.pos.close}
        className="flex min-h-16 min-w-24 flex-col items-center justify-center gap-1.5 rounded-xl border border-outline-variant px-3 py-2 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Moon size={18} aria-hidden />
        <span className="text-center leading-tight">End of day</span>
      </Link>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  hint,
  onClick,
  disabled,
  danger,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-16 min-w-24 flex-col items-center justify-center gap-1.5 rounded-xl border border-outline-variant px-3 py-2 text-xs font-medium transition-colors hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40 dark:border-zinc-800 dark:hover:bg-zinc-800 ${
        danger
          ? "text-error dark:text-red-400"
          : "text-on-surface-variant dark:text-zinc-300"
      }`}
    >
      <span aria-hidden>{icon}</span>
      <span className="text-center leading-tight">{label}</span>
      {hint && (
        <kbd className="rounded border border-outline-variant px-1 text-[10px] opacity-60 dark:border-zinc-700">
          {hint}
        </kbd>
      )}
    </button>
  );
}
