"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: ModalSize;
};

export const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: ModalProps) => {
  const isBrowser = typeof window !== "undefined";
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isBrowser || !open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isBrowser, open, onClose]);

  if (!isBrowser || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div
        className="absolute inset-0 bg-slate-900/50"
        role="presentation"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${titleId}-title` : undefined}
        aria-describedby={description ? `${descriptionId}-description` : undefined}
        className={cn(
          "relative z-10 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl",
          size === "sm"
            ? "max-w-xl"
            : size === "lg"
            ? "max-w-3xl"
            : size === "xl"
            ? "max-w-4xl"
            : "max-w-2xl"
        )}
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            {title ? (
              <h2 id={`${titleId}-title`} className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p id={`${descriptionId}-description`} className="mt-1 text-sm text-slate-600">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Close
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
};
