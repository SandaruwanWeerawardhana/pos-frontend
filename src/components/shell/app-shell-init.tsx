"use client";

import { useEffect } from "react";
import { useConnectionListener } from "@/lib/store/connection";
import { syncManager } from "@/lib/sync";

export function AppShellInit() {
  useConnectionListener();

  useEffect(() => {
    syncManager.start();
    return () => syncManager.stop();
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    }
  }, []);

  return null;
}
