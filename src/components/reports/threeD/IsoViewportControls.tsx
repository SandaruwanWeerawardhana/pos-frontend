"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import { MAX_ZOOM, MIN_ZOOM } from "./use-iso-viewport";

interface IsoViewportControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const BUTTON_CLASS =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/55 text-white/85 backdrop-blur-sm transition-colors duration-[var(--duration-fast)] hover:bg-black/75 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-35";

export function IsoViewportControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: Readonly<IsoViewportControlsProps>) {
  return (
    <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
      <span className="rounded-lg border border-white/15 bg-black/55 px-2 py-1 text-[10px] font-semibold tabular-nums text-white/85 backdrop-blur-sm">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={onZoomOut}
        disabled={zoom <= MIN_ZOOM + 0.001}
        aria-label="Zoom out"
        title="Zoom out"
        className={BUTTON_CLASS}
      >
        <Minus size={15} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        disabled={zoom >= MAX_ZOOM - 0.001}
        aria-label="Zoom in"
        title="Zoom in"
        className={BUTTON_CLASS}
      >
        <Plus size={15} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onReset}
        aria-label="Reset view"
        title="Reset view"
        className={BUTTON_CLASS}
      >
        <Maximize2 size={14} aria-hidden />
      </button>
    </div>
  );
}
