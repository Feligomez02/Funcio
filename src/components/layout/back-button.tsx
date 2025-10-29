"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type BackButtonProps = {
  fallbackHref?: string;
  label?: string;
  className?: string;
};

export const BackButton = ({
  fallbackHref = "/",
  label = "Back",
  className,
}: BackButtonProps) => {
  const router = useRouter();

  const handleClick = () => {
    const target = fallbackHref ?? "/";
    // Push ensures deterministic navigation; cast covers dynamic dashboard routes
    router.push(target as Parameters<typeof router.push>[0]);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleClick}
      className={`-ml-2 inline-flex items-center gap-2 px-2 py-1 text-slate-600 hover:text-slate-900 ${className ?? ""}`}
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </Button>
  );
};
