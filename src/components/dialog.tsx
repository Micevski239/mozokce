"use client";

import { X } from "lucide-react";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};

/**
 * Модален прозорец со стаклен панел. Се затвора со Esc, клик надвор или ✕.
 *
 * Се рендерира преку portal во <body>: стаклените панели имаат backdrop-filter,
 * а тој создава нов containing block за `position: fixed`, па модал отворен од
 * панел би бил заробен (и исечен) внатре во тој панел.
 */
export function Dialog({
  open,
  onClose,
  title,
  kicker,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  kicker?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  // false на серверот и при hydration, true потоа: portal-от постои само во прелистувачот.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[rgba(4,10,22,.45)] p-2 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal
        className={`glass-strong my-auto w-full ${wide ? "max-w-2xl" : "max-w-md"} p-4 sm:p-6`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {kicker && <div className="kicker mb-1">{kicker}</div>}
            <h2 className="display text-xl font-semibold">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon -mr-2 -mt-1 shrink-0" aria-label="Затвори">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
