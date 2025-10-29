import { resolveLocale, type Locale } from "./config";
import type { Dictionary } from "./types";

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((module) => module.default),
  es: () => import("./dictionaries/es").then((module) => module.default),
};

export const getDictionary = async (input: unknown): Promise<Dictionary> => {
  const locale = resolveLocale(input);
  return loaders[locale]();
};
