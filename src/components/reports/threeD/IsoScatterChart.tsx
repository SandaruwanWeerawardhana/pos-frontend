"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { depthOf, projectRotated, type Point2, type Vec3 } from "./iso";
import type { ProductMetric } from "@/lib/db/reports-3d";

const AXIS_UNITS = 3;
const DRAG_SENSITIVITY = 0.012;
const AUTO_ROTATE_SPEED = 0.0035; /* radians per frame */
const FIT_PADDING = 0.78;
const DOT_COLOR = "#ec4899";

interface IsoScatterChartProps {
  points: ProductMetric[];
  autoRotate: boolean;
  height?: number;
  formatMoney: (cents: number) => string;
  emptyMessage?: string;
}

function fit(points: Point2[], canvasWidth: number, canvasHeight: number) {
  if (points.length === 0) {
    return { scale: 1, offsetX: canvasWidth / 2, offsetY: canvasHeight / 2 };
  }
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const scale = Math.min((canvasWidth * FIT_PADDING) / width, (canvasHeight * FIT_PADDING) / height);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return {
    scale,
    offsetX: canvasWidth / 2 - centerX * scale,
    offsetY: canvasHeight / 2 - centerY * scale,
  };
}

/**
 * Quantity x Price x Revenue as a genuine 3D point cloud on an HTML canvas.
 * Auto-rotates around the vertical axis when `autoRotate` is on; dragging
 * always overrides it for the duration of the drag.
 */
export function IsoScatterChart({
  points,
  autoRotate,
  height = 280,
  formatMoney,
  emptyMessage = "No product sales in this period.",
}: Readonly<IsoScatterChartProps>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const azimuthRef = useRef(0.6);
  const draggingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dotsRef = useRef<{ pos: Point2; radius: number; label: string; revenueCents: number }[]>([]);
  const [hover, setHover] = useState<{ x: number; y: number; label: string; revenueCents: number } | null>(
    null,
  );

  const maxQuantity = useMemo(() => Math.max(1, ...points.map((p) => p.quantity)), [points]);
  const maxPrice = useMemo(() => Math.max(1, ...points.map((p) => p.avgPriceCents)), [points]);
  const maxRevenue = useMemo(() => Math.max(1, ...points.map((p) => p.revenueCents)), [points]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const width = container.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, width, height);

    const theta = azimuthRef.current;
    const axisMax: Vec3 = { x: AXIS_UNITS, y: AXIS_UNITS, z: AXIS_UNITS };
    const bounds: Vec3[] = [
      { x: 0, y: 0, z: 0 },
      axisMax,
      { x: AXIS_UNITS, y: 0, z: AXIS_UNITS },
    ];
    const { scale, offsetX, offsetY } = fit(
      bounds.map((p) => projectRotated(p, theta)),
      width,
      height,
    );
    const toScreen = (p: Vec3): Point2 => {
      const projected = projectRotated(p, theta);
      return { x: projected.x * scale + offsetX, y: projected.y * scale + offsetY };
    };

    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1.2;
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";

    const origin = toScreen({ x: 0, y: 0, z: 0 });
    const xEnd = toScreen({ x: AXIS_UNITS, y: 0, z: 0 });
    const zEnd = toScreen({ x: 0, y: 0, z: AXIS_UNITS });
    const yEnd = toScreen({ x: 0, y: AXIS_UNITS, z: 0 });

    for (const [end, label] of [
      [xEnd, "Quantity"],
      [zEnd, "Price"],
      [yEnd, "Revenue"],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.fillText(label, end.x + 4, end.y - 4);
    }

    for (let i = 1; i <= AXIS_UNITS; i++) {
      const gx = toScreen({ x: i, y: 0, z: AXIS_UNITS });
      const gz = toScreen({ x: AXIS_UNITS, y: 0, z: i });
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.moveTo(toScreen({ x: i, y: 0, z: 0 }).x, toScreen({ x: i, y: 0, z: 0 }).y);
      ctx.lineTo(gx.x, gx.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(toScreen({ x: 0, y: 0, z: i }).x, toScreen({ x: 0, y: 0, z: i }).y);
      ctx.lineTo(gz.x, gz.y);
      ctx.stroke();
    }

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
  }, [points, height, maxQuantity, maxPrice, maxRevenue]);

  useEffect(() => {
    function loop() {
      if (autoRotate && !draggingRef.current) {
        azimuthRef.current += AUTO_ROTATE_SPEED;
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [draw, autoRotate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = true;
    lastPointerXRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingRef.current) {
      const delta = event.clientX - lastPointerXRef.current;
      lastPointerXRef.current = event.clientX;
      azimuthRef.current += delta * DRAG_SENSITIVITY;
      setHover(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const nearest = dotsRef.current.find(
      (dot) => Math.hypot(dot.pos.x - px, dot.pos.y - py) <= dot.radius + 4,
    );
    setHover(nearest ? { x: px, y: py, label: nearest.label, revenueCents: nearest.revenueCents } : null);
  }, []);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handlePointerLeave = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      handlePointerUp(event);
      setHover(null);
    },
    [handlePointerUp],
  );

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl" style={{ height }}>
      <canvas
        ref={canvasRef}
        className="cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />
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
