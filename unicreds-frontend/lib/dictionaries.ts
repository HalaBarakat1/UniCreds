import "server-only";
import type { Locale } from "./i18n-config";
import type { Dictionary } from "@/types/dictionary";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((mod) => mod.default as Dictionary),
  ar: () => import("./dictionaries/ar.json").then((mod) => mod.default as Dictionary),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const loader = dictionaries[locale] ?? dictionaries.en;
  return loader();
}
