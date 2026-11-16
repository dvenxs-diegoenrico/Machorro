"use client";

import { demoSource } from "@/lib/sessions/demoSource";
import { supabaseSource } from "@/lib/sessions/supabaseSource";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { Console } from "./Console";

/** The console wired to the demo (no account needed). */
export function DemoConsole({ locale, t }: { locale: Locale; t: Dictionary }) {
  return <Console source={demoSource} projectId="demo" locale={locale} t={t} demo />;
}

/** The console wired to Supabase, for a real session. */
export function SessionConsole({ id, locale, t }: { id: string; locale: Locale; t: Dictionary }) {
  return <Console source={supabaseSource} projectId={id} locale={locale} t={t} />;
}
