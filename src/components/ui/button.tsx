"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, DetailedHTMLProps } from "react";

type ButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  variant?: "primary" | "secondary" | "tertiary" | "ghost";
};

// Softer, modern button styles inspired by the provided references.
const baseStyles =
  "inline-flex max-w-full flex-wrap items-center justify-center overflow-hidden rounded-xl px-3.5 py-2.5 text-sm font-semibold text-center leading-snug transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const variantStyles: Record<string, string> = {
  primary:
    "bg-black text-white shadow-sm shadow-slate-600/30 hover:bg-slate-900 focus-visible:ring-black",
  secondary:
    "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 focus-visible:ring-slate-400",
  tertiary:
    "bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:ring-slate-300",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100/60 hover:text-slate-900 focus-visible:ring-slate-300",
};

export const Button = ({ className, variant = "primary", ...props }: ButtonProps) => (
  <button className={cn(baseStyles, variantStyles[variant], className)} {...props} />
);
