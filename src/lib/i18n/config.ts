export const locales = ["en", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const isLocale = (value: unknown): value is Locale => {
  return typeof value === "string" && locales.includes(value as Locale);
};

export const resolveLocale = (value: unknown): Locale => {
  if (isLocale(value)) {
    return value;
  }

  if (typeof value === "string") {
    const [language] = value.toLowerCase().split(/[-_]/);
    if (isLocale(language)) {
      return language;
    }
  }

  return defaultLocale;
};
