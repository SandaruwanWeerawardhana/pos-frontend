"use client";

import { useHardware } from "@/lib/hooks/use-hardware";
import type { DeviceKind, DeviceStatus } from "@/lib/types";

const STATUS_LABEL: Record<DeviceStatus, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting…",
  connected: "Connected",
  error: "Error",
};

const STATUS_DOT: Record<DeviceStatus, string> = {
  disconnected: "bg-zinc-400",
  connecting: "bg-amber-500",
  connected: "bg-green-500",
  error: "bg-red-500",
};

type DeviceIndicatorProps = Readonly<{
  label: string;
  kind: DeviceKind;
}>;

function DeviceIndicator({ label, kind }: DeviceIndicatorProps) {
  const device = useHardware(kind);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[device.status]}`} />
      {label}: {STATUS_LABEL[device.status]}
      {device.simulated && device.status === "connected" ? " (simulated)" : ""}
    </span>
  );
}

export function HardwareStatusBar() {
  return (
    <div className="flex items-center gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
      <DeviceIndicator label="Scale" kind="scale" />
      <DeviceIndicator label="Barcode" kind="barcode" />
    </div>
  );
}
