"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  centerOf,
  depthOf,
  fitScale,
  pointInPolygon,
  projectRotated,
  shadeHex,
  type Point2,
  type Vec3,
} from "./iso";
import { IsoViewportControls } from "./IsoViewportControls";
import { useIsoViewport } from "./use-iso-viewport";
import type { Grid3D } from "@/lib/db/reports-3d";

const MAX_HEIGHT_UNITS = 3;
const BAR_SIZE = 0.62; /* footprint width/depth of a bar, cell pitch is 1 */
const FIT_PADDING = 0.82;
const LABEL_FONT = "11px system-ui, sans-serif";
const LABEL_LINE_HEIGHT = 12;
const INITIAL_AZIMUTH = -0.55;

interface IsoGridBarChartProps {
  grid: Grid3D;
  rowColors: string[];
  valueFormatter: (value: number) => string;
  axisLabel?: string;
  height?: number;
  emptyMessage?: string;
}

interface BarHit {
  faces: Point2[][];
  rowLabel: string;
  columnLabel: string;
  value: number;
}

interface HoverState {
  x: number;
  y: number;
  rowLabel: string;
  columnLabel: string;
  value: number;
}

/**
 * A month/hour x warehouse/product/day grid rendered as extruded isometric
 * bars on an HTML canvas. Drag horizontally to rotate around the vertical
 * axis — bar height always stays vertical on screen, only the ground plane
 * turns, so magnitude reads the same from any angle. Wheel/pinch zooms,
 * shift-drag (or right/middle drag) pans, and hovering a bar reads out its
 * exact value.
 */
export function IsoGridBarChart({
  grid,
  rowColors,
  valueFormatter,
  axisLabel,
  height = 320,
  emptyMessage = "No data for this period.",
}: Readonly<IsoGridBarChartProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<BarHit[]>([]);
  const drawRef = useRef<() => void>(() => {});
  const [hover, setHover] = useState<HoverState | null>(null);

  const requestDraw = useCallback(() => drawRef.current(), []);
  const viewport = useIsoViewport({ initialAzimuth: INITIAL_AZIMUTH, onChange: requestDraw });
  const { canvasRef, viewRef } = viewport;

  const maxValue = useMemo(() => Math.max(1, ...grid.values.flat()), [grid.values]);

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

    const cols = grid.columns.length;
    const rows = grid.rows.length;
    if (cols === 0 || rows === 0) {
      barsRef.current = [];
      return;
    }
    const view = viewRef.current;
    const theta = view.azimuth;
    const halfW = cols / 2;
    const halfD = rows / 2;

    const sceneCorners: Vec3[] = [];
    for (const x of [-halfW - 1, halfW + 1]) {
      for (const z of [-halfD - 1, halfD + 1]) {
        for (const y of [0, MAX_HEIGHT_UNITS]) {
          sceneCorners.push({ x, y, z });
        }
      }
    }
    const scale = fitScale(sceneCorners, width, height, FIT_PADDING) * view.zoom;
    const center = centerOf(sceneCorners.map((corner) => projectRotated(corner, theta)));
    const offsetX = width / 2 - center.x * scale + view.panX;
    const offsetY = height / 2 - center.y * scale + view.panY;
    const toScreen = (point: Vec3): Point2 => {
      const projected = projectRotated(point, theta);
      return { x: projected.x * scale + offsetX, y: projected.y * scale + offsetY };
    };

    ctx.strokeStyle = "rgba(255,255,255,0.14)";
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
    const axisBottom = toScreen(axisBase);
    const axisTop = toScreen({ ...axisBase, y: MAX_HEIGHT_UNITS });
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(axisBottom.x, axisBottom.y);
    ctx.lineTo(axisTop.x, axisTop.y);
    ctx.stroke();

    /*
     * Labels are drawn against a dark plot with bars behind them, so each one
     * gets a shadow for contrast and claims a box first — anything that would
     * collide with an already-drawn label is dropped rather than smeared over
     * it, which is what happens when a dense grid is rotated edge-on.
     */
    const claimedBoxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
    const drawLabel = (
      text: string,
      x: number,
      y: number,
      align: CanvasTextAlign,
      baseline: CanvasTextBaseline,
    ) => {
      const textWidth = ctx.measureText(text).width;
      let left = x;
      if (align === "center") left = x - textWidth / 2;
      else if (align === "right") left = x - textWidth;
      const top = baseline === "middle" ? y - LABEL_LINE_HEIGHT / 2 : y;
      const box = {
        x0: left - 2,
        y0: top - 2,
        x1: left + textWidth + 2,
        y1: top + LABEL_LINE_HEIGHT + 2,
      };
      const collides = claimedBoxes.some(
        (other) => box.x0 < other.x1 && box.x1 > other.x0 && box.y0 < other.y1 && box.y1 > other.y0,
      );
      if (collides) return;
      claimedBoxes.push(box);
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      ctx.fillText(text, x, y);
    };

    ctx.font = LABEL_FONT;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.shadowColor = "rgba(0,0,0,0.95)";
    ctx.shadowBlur = 4;

    for (const fraction of [0, 0.5, 1]) {
      const tick = toScreen({ ...axisBase, y: MAX_HEIGHT_UNITS * fraction });
      drawLabel(valueFormatter(maxValue * fraction), tick.x - 6, tick.y, "right", "middle");
    }
    if (axisLabel) {
      drawLabel(axisLabel, axisTop.x, axisTop.y - 16, "left", "top");
    }
    grid.columns.forEach((column, index) => {
      const pos = toScreen({ x: index - halfW + 0.5, y: 0, z: halfD + 0.6 });
      drawLabel(column.label, pos.x, pos.y + 4, "center", "top");
    });
    grid.rows.forEach((row, index) => {
      const pos = toScreen({ x: -halfW - 0.7, y: 0, z: index - halfD + 0.5 });
      const text = row.label.length > 14 ? `${row.label.slice(0, 13)}…` : row.label;
      drawLabel(text, pos.x - 4, pos.y, "right", "middle");
    });

    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    interface Bar {
      depth: number;
      corners: Record<string, Point2>;
      color: string;
      rowLabel: string;
      columnLabel: string;
      value: number;
    }
    const bars: Bar[] = [];
    grid.rows.forEach((row, rowIndex) => {
      grid.columns.forEach((column, colIndex) => {
        const value = grid.values[rowIndex]?.[colIndex] ?? 0;
        if (value <= 0) return;
        const barHeight = (value / maxValue) * MAX_HEIGHT_UNITS;
        const cx = colIndex - halfW + 0.5;
        const cz = rowIndex - halfD + 0.5;
        const x0 = cx - BAR_SIZE / 2;
        const x1 = cx + BAR_SIZE / 2;
        const z0 = cz - BAR_SIZE / 2;
        const z1 = cz + BAR_SIZE / 2;
        const center3d: Vec3 = { x: cx, y: barHeight / 2, z: cz };
        bars.push({
          depth: depthOf(center3d, theta),
          color: rowColors[rowIndex % rowColors.length],
          rowLabel: row.label,
          columnLabel: column.label,
          value,
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

    barsRef.current = bars.map((bar) => {
      const { t00, t10, t01, t11, b10, b11, b01 } = bar.corners;
      return {
        faces: [
          [t00, t10, t11, t01],
          [t01, t11, b11, b01],
          [t10, t11, b11, b10],
        ],
        rowLabel: bar.rowLabel,
        columnLabel: bar.columnLabel,
        value: bar.value,
      };
    });
  }, [grid, rowColors, valueFormatter, axisLabel, height, maxValue, canvasRef, viewRef]);

  useEffect(() => {
    drawRef.current = draw;
    draw();
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
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      /* Bars are painted far-to-near, so scan back-to-front to hit the topmost one. */
      const bars = barsRef.current;
      for (let index = bars.length - 1; index >= 0; index--) {
        const bar = bars[index];
        if (bar.faces.some((face) => pointInPolygon(point, face))) {
          setHover({
            x: point.x,
            y: point.y,
            rowLabel: bar.rowLabel,
            columnLabel: bar.columnLabel,
            value: bar.value,
          });
          return;
        }
      }
      setHover(null);
    },
    [viewport],
  );

  const handlePointerLeave = useCallback(() => setHover(null), []);

  const isEmpty = grid.values.flat().every((value) => value <= 0);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl" style={{ height }}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="3D bar chart. Drag to rotate, scroll or pinch to zoom, shift-drag to pan. Arrow keys rotate, plus and minus zoom, zero resets."
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
      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/60">
          {emptyMessage}
        </div>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-black/85 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: hover.x, top: hover.y - 10 }}
        >
          <p className="font-medium">{hover.rowLabel}</p>
          <p className="text-white/70">
            {hover.columnLabel} · {valueFormatter(hover.value)}
          </p>
        </div>
      )}
    </div>
  );
}
