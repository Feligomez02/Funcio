"use client";

import { cn } from "@/lib/utils";
import type { DetailedHTMLProps, TextareaHTMLAttributes } from "react";

type TextareaProps = DetailedHTMLProps<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  HTMLTextAreaElement
>;

export const Textarea = ({ className, ...props }: TextareaProps) => (
  <textarea
    className={cn(
      "w-full rounded-lg border border-transparent bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm ring-1 ring-slate-200 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-400/60 disabled:cursor-not-allowed disabled:opacity-60",
      className
    )}
    {...props}
  />
);
