import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "outline" | "success" | "warning" | "info";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const BASE_CLASSES =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-slate-900 text-white",
  outline:
    "border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200",
  success: "bg-emerald-600 text-white",
  warning: "bg-amber-500 text-slate-900",
  info: "bg-slate-100 text-slate-800",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: BadgeProps) {
  const classes = [
    BASE_CLASSES,
    VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.default,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={classes} {...props} />;
}
