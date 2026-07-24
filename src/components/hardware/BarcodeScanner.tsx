"use client";

import { useEffect, useRef, useState } from "react";
import { useBarcode, useCameraBarcodeSupport } from "@/lib/hooks/use-barcode";
import { Button } from "@/components/ui/Button";

interface BarcodeDetectorResult {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
}

type BarcodeScannerProps = Readonly<{
  onScan: (code: string) => void;
}>;

// Two real input paths: a USB HID scanner in keyboard-wedge mode (always
// listening via useBarcode) and, where the browser supports it, live camera
// decoding via the BarcodeDetector API (Chrome/Edge).
export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const cameraSupported = useCameraBarcodeSupport();
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useBarcode({ onScan, enabled: !cameraActive });

  useEffect(() => {
    if (!cameraActive) return;

    let cancelled = false;
    let frameId: number;

    async function start() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const DetectorCtor = (
        window as unknown as {
          BarcodeDetector: new (opts: {
            formats: string[];
          }) => BarcodeDetectorLike;
        }
      ).BarcodeDetector;
      const detector = new DetectorCtor({
        formats: ["ean_13", "code_128", "upc_a", "qr_code"],
      });

      async function tick() {
        if (cancelled || !videoRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          if (results[0]?.rawValue) {
            onScan(results[0].rawValue);
            setCameraActive(false);
            return;
          }
        } catch {
          // transient decode errors are normal mid-stream, keep polling
        }
        frameId = requestAnimationFrame(tick);
      }
      frameId = requestAnimationFrame(tick);
    }

    start().catch(() => setCameraActive(false));

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraActive, onScan]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          value={manualCode}
          onChange={(event) => setManualCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && manualCode) {
              onScan(manualCode);
              setManualCode("");
            }
          }}
          placeholder="Scan (USB wedge) or type a barcode…"
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        {cameraSupported && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setCameraActive((prev) => !prev)}
          >
            {cameraActive ? "Stop camera" : "Scan with camera"}
          </Button>
        )}
      </div>
      {cameraActive && (
        <video
          ref={videoRef}
          className="w-full max-w-xs rounded-lg"
          muted
          playsInline
        />
      )}
      {!cameraSupported && (
        <p className="text-xs text-zinc-400">
          Camera scanning isn&apos;t supported in this browser — USB scanner
          (keyboard wedge) still works.
        </p>
      )}
    </div>
  );
}
