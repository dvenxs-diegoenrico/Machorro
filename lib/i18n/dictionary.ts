import type { Locale } from "./config";
import { en } from "@/content/dictionaries/en";
import { es } from "@/content/dictionaries/es";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, es };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
