"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { cn } from "@/lib/utils";
import type { Route } from "next";
import { useI18n } from "@/components/i18n/i18n-provider";

const LINK_KEYS = [
  { href: "/projects" as Route, key: "projects" as const },
  { href: "/settings" as Route, key: "settings" as const },
];

type AppShellProps = {
  userEmail?: string | null;
  children: ReactNode;
};

export const AppShell = ({ userEmail, children }: AppShellProps) => {
  const pathname = usePathname();
  const {
    dictionary: { appShell },
  } = useI18n();

  const links = useMemo(
    () =>
      LINK_KEYS.map((link) => ({
        href: link.href,
        label: appShell.nav[link.key] ?? link.key,
      })),
    [appShell.nav]
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-semibold text-slate-900"
            aria-label={appShell.brand}
          >
            <Image
              src="/images/funcio-logo.png"
              alt={appShell.brand}
              width={32}
              height={32}
              className="h-14 w-14"
              priority
            />
            <span className="hidden sm:inline">{appShell.brand}</span>
          </Link>
          <nav className="flex flex-1 items-center gap-3 text-sm text-slate-700">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3.5 py-2 transition",
                  pathname?.startsWith(link.href)
                    ? "bg-slate-900 text-white shadow-sm shadow-black/10"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="ml-auto flex items-center gap-3">
              <LanguageToggle />
              <div className="flex items-center gap-3 pl-4 text-xs text-slate-500">
                <span className="hidden sm:inline" aria-label={appShell.accountLabel}>
                  {userEmail}
                </span>
                <SignOutButton />
              </div>
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
};
