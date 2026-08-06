"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const MIN_ZOOM = 0.6;
export const MAX_ZOOM = 8;

const WHEEL_SENSITIVITY = 0.0016;
const WHEEL_LINE_HEIGHT = 16;
const BUTTON_ZOOM_FACTOR = 1.35;
const ROTATE_SENSITIVITY = 0.012;
const KEY_ROTATE_STEP = 0.15;

export interface IsoViewport {
  azimuth: number;
  zoom: number;
  panX: number;
  panY: number;
}

interface UseIsoViewportOptions {
  initialAzimuth: number;
  onChange: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Shared camera state for the canvas-based 3D report charts: azimuth from
 * horizontal drag, zoom from wheel/pinch/buttons, and pan from shift-drag,
 * middle/right drag or two-finger drag. Everything lives in refs so a gesture
 * redraws the canvas without re-rendering React; only the zoom readout is
 * mirrored into state for the on-screen controls.
 */
export function useIsoViewport({ initialAzimuth, onChange }: UseIsoViewportOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<IsoViewport>({ azimuth: initialAzimuth, zoom: 1, panX: 0, panY: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; x: number; y: number } | null>(null);
  const panningRef = useRef(false);
  const interactingRef = useRef(false);
  const changeRef = useRef(onChange);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);

  /**
   * Scales about a screen anchor so the point under the cursor/pinch centre
   * stays put. Screen position is `centre + scale * zoom * (world - sceneCentre)
   * + pan`, so holding it fixed means shifting pan by the anchor offset times
   * the change in zoom ratio.
   */
  const applyZoom = useCallback((factor: number, clientX?: number, clientY?: number) => {
    const view = viewRef.current;
    const next = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const ratio = next / view.zoom;
    if (ratio === 1) return;
    const canvas = canvasRef.current;
    if (canvas && clientX !== undefined && clientY !== undefined) {
      const rect = canvas.getBoundingClientRect();
      const anchorX = clientX - rect.left - rect.width / 2 - view.panX;
      const anchorY = clientY - rect.top - rect.height / 2 - view.panY;
      view.panX += anchorX * (1 - ratio);
      view.panY += anchorY * (1 - ratio);
    }
    view.zoom = next;
    setZoom(next);
  }, []);

  const applyReset = useCallback(() => {
    viewRef.current = { azimuth: initialAzimuth, zoom: 1, panX: 0, panY: 0 };
    setZoom(1);
  }, [initialAzimuth]);

  const zoomIn = useCallback(() => {
    applyZoom(BUTTON_ZOOM_FACTOR);
    changeRef.current();
  }, [applyZoom]);

  const zoomOut = useCallback(() => {
    applyZoom(1 / BUTTON_ZOOM_FACTOR);
    changeRef.current();
  }, [applyZoom]);

  const reset = useCallback(() => {
    applyReset();
    changeRef.current();
  }, [applyReset]);

  /**
   * Wheel is bound natively because React registers its `onWheel` listener as
   * passive, which makes `preventDefault` a no-op and lets the page scroll
   * instead of the chart zooming.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= WHEEL_LINE_HEIGHT;
      else if (event.deltaMode === 2) delta *= canvas?.clientHeight ?? WHEEL_LINE_HEIGHT;
      applyZoom(Math.exp(-delta * WHEEL_SENSITIVITY), event.clientX, event.clientY);
      changeRef.current();
    }
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [applyZoom]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const pointers = pointersRef.current;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    interactingRef.current = true;
    if (pointers.size >= 2) {
      const [first, second] = [...pointers.values()];
      pinchRef.current = {
        distance: Math.hypot(first.x - second.x, first.y - second.y),
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
      return;
    }
    panningRef.current = event.shiftKey || event.button === 1 || event.button === 2;
  }, []);

  /** Returns true when the gesture consumed the move, so callers can skip hover work. */
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      const pointers = pointersRef.current;
      const previous = pointers.get(event.pointerId);
      if (!previous) return false;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const view = viewRef.current;

      if (pointers.size >= 2) {
        const [first, second] = [...pointers.values()];
        const distance = Math.hypot(first.x - second.x, first.y - second.y);
        const centerX = (first.x + second.x) / 2;
        const centerY = (first.y + second.y) / 2;
        const pinch = pinchRef.current;
        if (pinch && pinch.distance > 0) {
          view.panX += centerX - pinch.x;
          view.panY += centerY - pinch.y;
          applyZoom(distance / pinch.distance, centerX, centerY);
        }
        pinchRef.current = { distance, x: centerX, y: centerY };
        changeRef.current();
        return true;
      }

      const deltaX = event.clientX - previous.x;
      const deltaY = event.clientY - previous.y;
      if (panningRef.current) {
        view.panX += deltaX;
        view.panY += deltaY;
      } else {
        view.azimuth += deltaX * ROTATE_SENSITIVITY;
      }
      changeRef.current();
      return true;
    },
    [applyZoom],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const pointers = pointersRef.current;
    pointers.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (pointers.size < 2) pinchRef.current = null;
    if (pointers.size === 0) {
      panningRef.current = false;
      interactingRef.current = false;
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLCanvasElement>) => {
      const view = viewRef.current;
      switch (event.key) {
        case "ArrowLeft":
          view.azimuth -= KEY_ROTATE_STEP;
          break;
        case "ArrowRight":
          view.azimuth += KEY_ROTATE_STEP;
          break;
        case "+":
        case "=":
          applyZoom(BUTTON_ZOOM_FACTOR);
          break;
        case "-":
        case "_":
          applyZoom(1 / BUTTON_ZOOM_FACTOR);
          break;
        case "0":
          applyReset();
          break;
        default:
          return;
      }
      event.preventDefault();
      changeRef.current();
    },
    [applyZoom, applyReset],
  );

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
  }, []);

  return {
    canvasRef,
    viewRef,
    interactingRef,
    zoom,
    zoomIn,
    zoomOut,
    reset,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyDown,
    handleContextMenu,
  };
}
