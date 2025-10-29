"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type DrawerSize = "sm" | "md" | "lg" | "xl";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: DrawerSize;
};

const sizeToWidth: Record<DrawerSize, string> = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
};

export const Drawer = ({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: DrawerProps) => {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
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
  }, [open, onClose]);

  if (typeof window === "undefined" || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
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
          "relative z-10 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-xl",
          sizeToWidth[size]
        )}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="space-y-1">
            {title ? (
              <h2 id={`${titleId}-title`} className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p
                id={`${descriptionId}-description`}
                className="text-sm text-slate-600"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>,
    document.body
  );
};
