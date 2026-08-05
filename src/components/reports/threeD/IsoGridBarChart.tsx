"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { depthOf, projectRotated, shadeHex, type Point2, type Vec3 } from "./iso";
import type { Grid3D } from "@/lib/db/reports-3d";

const MAX_HEIGHT_UNITS = 3;
const BAR_SIZE = 0.62; /* footprint width/depth of a bar, cell pitch is 1 */
const DRAG_SENSITIVITY = 0.012;
const FIT_PADDING = 0.82;

interface IsoGridBarChartProps {
  grid: Grid3D;
  rowColors: string[];
  valueFormatter: (value: number) => string;
  axisLabel?: string;
  height?: number;
  emptyMessage?: string;
}

function project(points: Vec3[], theta: number): Point2[] {
  return points.map((p) => projectRotated(p, theta));
}

function fit(
  points: Point2[],
  canvasWidth: number,
  canvasHeight: number,
): { scale: number; offsetX: number; offsetY: number } {
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
 * A month/hour x warehouse/product/day grid rendered as extruded isometric
 * bars on an HTML canvas. Drag horizontally to rotate around the vertical
 * axis — bar height always stays vertical on screen, only the ground plane
 * turns, so magnitude reads the same from any angle.
 */
export function IsoGridBarChart({
  grid,
  rowColors,
  valueFormatter,
  axisLabel,
  height = 320,
  emptyMessage = "No data for this period.",
}: Readonly<IsoGridBarChartProps>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const azimuthRef = useRef(-0.55);
  const draggingRef = useRef(false);
  const lastPointerXRef = useRef(0);

  const maxValue = useMemo(
    () => Math.max(1, ...grid.values.flat()),
    [grid.values],
  );

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

    const cols = grid.columns.length;
    const rows = grid.rows.length;
    if (cols === 0 || rows === 0) return;
    const theta = azimuthRef.current;
    const halfW = cols / 2;
    const halfD = rows / 2;

    const sceneCorners: Vec3[] = [
      { x: -halfW - 1, y: 0, z: -halfD - 1 },
      { x: halfW + 1, y: 0, z: -halfD - 1 },
      { x: -halfW - 1, y: 0, z: halfD + 1 },
      { x: halfW + 1, y: 0, z: halfD + 1 },
      { x: -halfW - 1, y: MAX_HEIGHT_UNITS, z: -halfD - 1 },
    ];
    const { scale, offsetX, offsetY } = fit(project(sceneCorners, theta), width, height);
    const toScreen = (p: Vec3): Point2 => {
      const projected = projectRotated(p, theta);
      return { x: projected.x * scale + offsetX, y: projected.y * scale + offsetY };
    };

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      const x = c - halfW;
      const a = toScreen({ x, y: 0, z: -halfD });
      const b = toScreen({ x, y: 0, z: halfD });
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const z = r - halfD;
      const a = toScreen({ x: -halfW, y: 0, z });
      const b = toScreen({ x: halfW, y: 0, z });
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    const axisBase: Vec3 = { x: -halfW - 0.6, y: 0, z: -halfD - 0.6 };
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    const axisBottom = toScreen(axisBase);
    const axisTop = toScreen({ ...axisBase, y: MAX_HEIGHT_UNITS });
    ctx.moveTo(axisBottom.x, axisBottom.y);
    ctx.lineTo(axisTop.x, axisTop.y);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const fraction of [0, 0.5, 1]) {
      const tick = toScreen({ ...axisBase, y: MAX_HEIGHT_UNITS * fraction });
      ctx.fillText(valueFormatter(maxValue * fraction), tick.x - 6, tick.y);
    }
    if (axisLabel) {
      ctx.save();
      ctx.textAlign = "left";
      ctx.fillText(axisLabel, axisTop.x, axisTop.y - 10);
      ctx.restore();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    grid.columns.forEach((column, index) => {
      const pos = toScreen({ x: index - halfW + 0.5, y: 0, z: halfD + 0.6 });
      ctx.fillText(column.label, pos.x, pos.y + 4);
    });
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    grid.rows.forEach((row, index) => {
      const pos = toScreen({ x: -halfW - 0.7, y: 0, z: index - halfD + 0.5 });
      ctx.fillText(row.label.length > 14 ? `${row.label.slice(0, 13)}…` : row.label, pos.x - 4, pos.y);
    });

    interface Bar {
      depth: number;
      corners: Record<string, Point2>;
      color: string;
    }
    const bars: Bar[] = [];
    grid.rows.forEach((_row, rowIndex) => {
      grid.columns.forEach((_column, colIndex) => {
        const value = grid.values[rowIndex]?.[colIndex] ?? 0;
        if (value <= 0) return;
        const barHeight = (value / maxValue) * MAX_HEIGHT_UNITS;
        const cx = colIndex - halfW + 0.5;
        const cz = rowIndex - halfD + 0.5;
        const x0 = cx - BAR_SIZE / 2;
        const x1 = cx + BAR_SIZE / 2;
        const z0 = cz - BAR_SIZE / 2;
        const z1 = cz + BAR_SIZE / 2;
        const center: Vec3 = { x: cx, y: barHeight / 2, z: cz };
        bars.push({
          depth: depthOf(center, theta),
          color: rowColors[rowIndex % rowColors.length],
          corners: {
            t00: toScreen({ x: x0, y: barHeight, z: z0 }),
            t10: toScreen({ x: x1, y: barHeight, z: z0 }),
            t01: toScreen({ x: x0, y: barHeight, z: z1 }),
            t11: toScreen({ x: x1, y: barHeight, z: z1 }),
            b10: toScreen({ x: x1, y: 0, z: z0 }),
            b11: toScreen({ x: x1, y: 0, z: z1 }),
            b01: toScreen({ x: x0, y: 0, z: z1 }),
          },
        });
      });
    });
    bars.sort((a, b) => a.depth - b.depth);

    for (const bar of bars) {
      const { t00, t10, t01, t11, b10, b11, b01 } = bar.corners;
      ctx.fillStyle = shadeHex(bar.color, -0.32);
      ctx.beginPath();
      ctx.moveTo(t01.x, t01.y);
      ctx.lineTo(t11.x, t11.y);
      ctx.lineTo(b11.x, b11.y);
      ctx.lineTo(b01.x, b01.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = shadeHex(bar.color, -0.12);
      ctx.beginPath();
      ctx.moveTo(t10.x, t10.y);
      ctx.lineTo(t11.x, t11.y);
      ctx.lineTo(b11.x, b11.y);
      ctx.lineTo(b10.x, b10.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = shadeHex(bar.color, 0.18);
      ctx.beginPath();
      ctx.moveTo(t00.x, t00.y);
      ctx.lineTo(t10.x, t10.y);
      ctx.lineTo(t11.x, t11.y);
      ctx.lineTo(t01.x, t01.y);
      ctx.closePath();
      ctx.fill();
    }
  }, [grid, rowColors, valueFormatter, axisLabel, height, maxValue]);

  useEffect(() => {
    draw();
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

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current) return;
      const delta = event.clientX - lastPointerXRef.current;
      lastPointerXRef.current = event.clientX;
      azimuthRef.current += delta * DRAG_SENSITIVITY;
      draw();
    },
    [draw],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const isEmpty = grid.values.flat().every((v) => v <= 0);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl" style={{ height }}>
      <canvas
        ref={canvasRef}
        className="cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/60">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
