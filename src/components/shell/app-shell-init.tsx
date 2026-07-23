"use client";

import { useEffect } from "react";
import { useConnectionListener } from "@/lib/store/connection";

export function AppShellInit() {
  useConnectionListener();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    }
  }, []);

  return null;
}
