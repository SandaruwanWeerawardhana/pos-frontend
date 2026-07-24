"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { HARDWARE_CONFIG } from "@/lib/types/hardware.config";

export interface UseBarcodeOptions {
  onScan: (code: string) => void;
  enabled?: boolean;
}

// USB barcode scanners in "keyboard wedge" mode act like a very fast
// keyboard, typing the code then Enter. This listens globally for that
// pattern (fast keydowns, ending in Enter) rather than requiring a focused
// input - the standard technique for HID scanners, no vendor SDK needed.
export function useBarcode({ onScan, enabled = true }: UseBarcodeOptions): void {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      const now = Date.now();
      const gap = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (gap > HARDWARE_CONFIG.barcodeWedgeMaxGapMs) {
        bufferRef.current = "";
      }

      if (event.key === "Enter") {
        if (bufferRef.current.length >= HARDWARE_CONFIG.barcodeWedgeMinLength) {
          onScan(bufferRef.current);
        }
        bufferRef.current = "";
        return;
      }

      if (event.key.length === 1) {
        bufferRef.current += event.key;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onScan]);
}

// Camera-based fallback support check for the BarcodeDetector API (Chrome/
// Edge only). BarcodeScanner.tsx uses this to decide whether to offer a
// "scan with camera" option. useSyncExternalStore (rather than a
// useState+useEffect pair) is the correct way to read this: the capability
// never changes mid-session, and the server snapshot (false) safely differs
// from the client snapshot without a synchronous setState-in-effect.
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useCameraBarcodeSupport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
