"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  glass?: boolean;
}

export function Modal({ open, onClose, title, children, glass = false }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 ${glass ? "backdrop-blur-sm" : ""}`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl p-6 shadow-xl ${
          glass
            ? "backdrop-blur-md bg-surface-container-lowest/80 dark:bg-zinc-900/90 border border-white/10"
            : "bg-surface-container-lowest dark:bg-zinc-900 border border-outline-variant/30 dark:border-zinc-800"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {title && (
          <h2 className="mb-4 text-lg font-semibold text-on-surface dark:text-zinc-50">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
