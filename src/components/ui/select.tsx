"use client";

import { cn } from "@/lib/utils";
import type { DetailedHTMLProps, SelectHTMLAttributes } from "react";

export type SelectProps = DetailedHTMLProps<
  SelectHTMLAttributes<HTMLSelectElement>,
  HTMLSelectElement
>;

export const Select = ({ className, ...props }: SelectProps) => (
  <select
    className={cn(
      "w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-transparent bg-white px-3.5 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-400/60 disabled:cursor-not-allowed disabled:opacity-60",
      className
    )}
    {...props}
  />
);

