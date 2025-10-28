'use client';

import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  widthClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Modal({
  open,
  title,
  onClose,
  widthClassName = "max-w-lg",
  children,
  footer,
}: ModalProps) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (open) {
      document.addEventListener("keydown", handleKey);
    }

    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 backdrop-blur">
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full rounded-3xl border border-black/5 bg-white shadow-xl shadow-black/10 ${widthClassName}`}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-transparent p-2 text-sm text-foreground/60 transition hover:border-foreground/10 hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t border-black/5 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
