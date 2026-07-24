"use client";

interface QuickActionsProps {
  onHold: () => void;
  onRecall: () => void;
  onClear: () => void;
  onNotImplemented: (label: string) => void;
  disabled: boolean;
}

type IconName =
  | "suspend"
  | "hold"
  | "recall"
  | "clear"
  | "print"
  | "drawer";

function Icon({ name }: Readonly<{ name: IconName }>) {
  const paths: Record<IconName, string> = {
    suspend: "M12 3a9 9 0 100 18 9 9 0 000-18zM5 5l14 14",
    hold: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    recall: "M3 12a9 9 0 109-9 9 9 0 00-9 9zm0 0H1m2 0l3-3m-3 3l3 3M12 7v5l3 2",
    clear: "M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0l-.5 12a2 2 0 01-2 2H8.5a2 2 0 01-2-2L6 7",
    print: "M6 9V4h12v5M6 18H4a2 2 0 01-2-2v-3a2 2 0 012-2h16a2 2 0 012 2v3a2 2 0 01-2 2h-2M6 14h12v6H6z",
    drawer: "M3 10h18M3 10l2-6h14l2 6M3 10v8a2 2 0 002 2h14a2 2 0 002-2v-8M10 14h4",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}

export function QuickActions({
  onHold,
  onRecall,
  onClear,
  onNotImplemented,
  disabled,
}: Readonly<QuickActionsProps>) {
  const actions: {
    label: string;
    icon: IconName;
    onClick: () => void;
    danger?: boolean;
  }[] = [
    { label: "Suspend Sale", icon: "suspend", onClick: () => onNotImplemented("Suspend Sale") },
    { label: "Hold Order", icon: "hold", onClick: onHold },
    { label: "Recall Order", icon: "recall", onClick: onRecall },
    { label: "Clear Cart", icon: "clear", onClick: onClear, danger: true },
    { label: "Print Receipt", icon: "print", onClick: () => onNotImplemented("Print Receipt") },
    { label: "Open Drawer", icon: "drawer", onClick: () => onNotImplemented("Open Drawer") },
  ];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Quick Actions
      </h3>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={disabled && action.label === "Clear Cart"}
            className={`flex flex-col items-center gap-2 rounded-xl border border-zinc-200 px-2 py-3 text-xs font-medium transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:hover:bg-zinc-800 ${
              action.danger
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-600 dark:text-zinc-300"
            }`}
          >
            <Icon name={action.icon} />
            <span className="text-center leading-tight">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
