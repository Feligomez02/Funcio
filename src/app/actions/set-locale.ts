"use server";

import { cookies } from "next/headers";
import { isLocale, type Locale } from "@/lib/i18n/config";

export const setLocale = async (nextLocale: string): Promise<{ ok: boolean; locale?: Locale }> => {
  if (!isLocale(nextLocale)) {
    return { ok: false };
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: "locale",
    value: nextLocale,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true, locale: nextLocale };
};
