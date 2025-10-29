import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-xl border border-slate-200 bg-white p-6 shadow-sm shadow-black/5",
      className
    )}
    {...props}
  />
);
