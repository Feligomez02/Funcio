"use client";

import { Fragment, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/app/actions/set-locale";
import { useI18n } from "@/components/i18n/i18n-provider";
import type { Locale } from "@/lib/i18n/config";

const OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "es", label: "ESP" },
  { value: "en", label: "EN" },
];

export const LanguageToggle = () => {
  const router = useRouter();
  const { locale, dictionary } = useI18n();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={dictionary.common.languageLabel}
      className="flex items-center rounded-full border border-slate-300 bg-white/70 px-2 py-1 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60"
    >
      {OPTIONS.map((option, index) => {
        const isActive = locale === option.value;
        const isLast = index === OPTIONS.length - 1;

        return (
          <Fragment key={option.value}>
            <button
              type="button"
              onClick={() => {
                if (isActive || isPending) {
                  return;
                }
                startTransition(async () => {
                  const result = await setLocale(option.value);
                  if (result.ok) {
                    router.refresh();
                  }
                });
              }}
              className={
                `rounded-full px-2 py-0.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm shadow-black/20"
                    : "hover:text-slate-900"
                } ${isPending ? "opacity-70" : ""}`
              }
              aria-pressed={isActive}
              disabled={isPending}
            >
              {option.label}
            </button>
            {isLast ? null : (
              <span aria-hidden="true" className="mx-1 select-none text-slate-300">
                |
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
};
