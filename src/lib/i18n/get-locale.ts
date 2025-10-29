import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, resolveLocale, type Locale } from "./config";

const parseAcceptLanguage = (headerValue: string | null | undefined): Locale | null => {
  if (!headerValue) {
    return null;
  }

  const locales = headerValue
    .split(",")
    .map((part) => part.trim().split(";")[0])
    .filter(Boolean);

  for (const locale of locales) {
    const normalized = resolveLocale(locale);
    if (isLocale(normalized)) {
      return normalized;
    }
  }

  return null;
};

export const getRequestLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  if (localeCookie && isLocale(localeCookie)) {
    return localeCookie;
  }

  const headerStore = await headers();
  const preferred = parseAcceptLanguage(headerStore.get("accept-language"));
  if (preferred) {
    return preferred;
  }

  return defaultLocale;
};
