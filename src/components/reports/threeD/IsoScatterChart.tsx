"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { centerOf, depthOf, fitScale, projectRotated, type Point2, type Vec3 } from "./iso";
import { IsoViewportControls } from "./IsoViewportControls";
import { useIsoViewport } from "./use-iso-viewport";
import type { ProductMetric } from "@/lib/db/reports-3d";

const AXIS_UNITS = 3;
const AUTO_ROTATE_SPEED = 0.0035; /* radians per frame */
const FIT_PADDING = 0.78;
const DOT_COLOR = "#ec4899";
const INITIAL_AZIMUTH = 0.6;

interface IsoScatterChartProps {
  points: ProductMetric[];
  autoRotate: boolean;
  height?: number;
  formatMoney: (cents: number) => string;
  emptyMessage?: string;
}

/**
 * Quantity x Price x Revenue as a genuine 3D point cloud on an HTML canvas.
 * Auto-rotates around the vertical axis when `autoRotate` is on; any pointer
 * gesture overrides it for its duration. Wheel/pinch zooms, shift-drag (or
 * right/middle drag) pans.
 */
export function IsoScatterChart({
  points,
  autoRotate,
  height = 280,
  formatMoney,
  emptyMessage = "No product sales in this period.",
}: Readonly<IsoScatterChartProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<{ pos: Point2; radius: number; label: string; revenueCents: number }[]>([]);
  const drawRef = useRef<() => void>(() => {});
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    label: string;
    revenueCents: number;
  } | null>(null);

  const requestDraw = useCallback(() => drawRef.current(), []);
  const viewport = useIsoViewport({ initialAzimuth: INITIAL_AZIMUTH, onChange: requestDraw });
  const { canvasRef, viewRef, interactingRef } = viewport;

  const maxQuantity = useMemo(() => Math.max(1, ...points.map((p) => p.quantity)), [points]);
  const maxPrice = useMemo(() => Math.max(1, ...points.map((p) => p.avgPriceCents)), [points]);
  const maxRevenue = useMemo(() => Math.max(1, ...points.map((p) => p.revenueCents)), [points]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const width = container.clientWidth;
    if (width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const deviceWidth = Math.round(width * dpr);
    const deviceHeight = Math.round(height * dpr);
    if (canvas.width !== deviceWidth || canvas.height !== deviceHeight) {
      canvas.width = deviceWidth;
      canvas.height = deviceHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, width, height);

    const view = viewRef.current;
    const theta = view.azimuth;
    const bounds: Vec3[] = [];
    for (const x of [0, AXIS_UNITS]) {
      for (const y of [0, AXIS_UNITS]) {
        for (const z of [0, AXIS_UNITS]) {
          bounds.push({ x, y, z });
        }
      }
    }
    const scale = fitScale(bounds, width, height, FIT_PADDING) * view.zoom;
    const center = centerOf(bounds.map((corner) => projectRotated(corner, theta)));
    const offsetX = width / 2 - center.x * scale + view.panX;
    const offsetY = height / 2 - center.y * scale + view.panY;
    const toScreen = (point: Vec3): Point2 => {
      const projected = projectRotated(point, theta);
      return { x: projected.x * scale + offsetX, y: projected.y * scale + offsetY };
    };

    const origin = toScreen({ x: 0, y: 0, z: 0 });

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= AXIS_UNITS; i++) {
      const xStart = toScreen({ x: i, y: 0, z: 0 });
      const xEnd = toScreen({ x: i, y: 0, z: AXIS_UNITS });
      ctx.beginPath();
      ctx.moveTo(xStart.x, xStart.y);
      ctx.lineTo(xEnd.x, xEnd.y);
      ctx.stroke();
      const zStart = toScreen({ x: 0, y: 0, z: i });
      const zEnd = toScreen({ x: AXIS_UNITS, y: 0, z: i });
      ctx.beginPath();
      ctx.moveTo(zStart.x, zStart.y);
      ctx.lineTo(zEnd.x, zEnd.y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.lineWidth = 1.2;
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.95)";
    ctx.shadowBlur = 4;
    for (const [end, label] of [
      [toScreen({ x: AXIS_UNITS, y: 0, z: 0 }), "Quantity"],
      [toScreen({ x: 0, y: 0, z: AXIS_UNITS }), "Price"],
      [toScreen({ x: 0, y: AXIS_UNITS, z: 0 }), "Revenue"],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.fillText(label, end.x + 4, end.y - 4);
    }
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    interface Dot {
      depth: number;
      pos: Point2;
      radius: number;
      label: string;
      revenueCents: number;
    }
    const dots: Dot[] = points.map((point) => {
      const vec: Vec3 = {
        x: (point.quantity / maxQuantity) * AXIS_UNITS,
        y: (point.revenueCents / maxRevenue) * AXIS_UNITS,
        z: (point.avgPriceCents / maxPrice) * AXIS_UNITS,
      };
      return {
        depth: depthOf(vec, theta),
        pos: toScreen(vec),
        radius: 4 + (point.revenueCents / maxRevenue) * 5,
        label: point.name,
        revenueCents: point.revenueCents,
      };
    });
    dots.sort((a, b) => a.depth - b.depth);
    dotsRef.current = dots;

    for (const dot of dots) {
      ctx.beginPath();
      ctx.fillStyle = DOT_COLOR;
      ctx.globalAlpha = 0.5 + (dot.depth / (AXIS_UNITS * 2)) * 0.5;
      ctx.arc(dot.pos.x, dot.pos.y, dot.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, [points, height, maxQuantity, maxPrice, maxRevenue, canvasRef, viewRef]);

  /*
   * The animation frame loop only runs while auto-rotate is on. With it off the
   * canvas is repainted on demand, so an idle dashboard is not burning a redraw
   * of every chart 60 times a second.
   */
  useEffect(() => {
    drawRef.current = draw;
    if (!autoRotate) {
      draw();
      return;
    }
    let frame = requestAnimationFrame(function loop() {
      if (!interactingRef.current) viewRef.current.azimuth += AUTO_ROTATE_SPEED;
      draw();
      frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
  }, [draw, autoRotate, interactingRef, viewRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (viewport.handlePointerMove(event)) {
        setHover(null);
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const nearest = dotsRef.current.find(
        (dot) => Math.hypot(dot.pos.x - px, dot.pos.y - py) <= dot.radius + 4,
      );
      setHover(
        nearest ? { x: px, y: py, label: nearest.label, revenueCents: nearest.revenueCents } : null,
      );
    },
    [viewport],
  );

  const handlePointerLeave = useCallback(() => setHover(null), []);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl" style={{ height }}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="3D scatter chart of quantity, price and revenue. Drag to rotate, scroll or pinch to zoom, shift-drag to pan. Arrow keys rotate, plus and minus zoom, zero resets."
        className="cursor-grab touch-none outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:cursor-grabbing"
        onPointerDown={viewport.handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={viewport.handlePointerUp}
        onPointerCancel={viewport.handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onKeyDown={viewport.handleKeyDown}
        onContextMenu={viewport.handleContextMenu}
        onDoubleClick={viewport.reset}
      />
      <IsoViewportControls
        zoom={viewport.zoom}
        onZoomIn={viewport.zoomIn}
        onZoomOut={viewport.zoomOut}
        onReset={viewport.reset}
      />
      <p className="pointer-events-none absolute bottom-2 left-3 text-[10px] text-white/45">
        Drag rotate · Scroll zoom · Shift-drag pan
      </p>
      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/60">
          {emptyMessage}
        </div>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-black/85 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: hover.x, top: hover.y - 10 }}
        >
          <p className="font-medium">{hover.label}</p>
          <p className="text-white/70">{formatMoney(hover.revenueCents)}</p>
        </div>
      )}
    </div>
  );
}
