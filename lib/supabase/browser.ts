"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from "./config";

let client: SupabaseClient | null = null;

/** The signed-in user's Supabase client in the browser, or null when not configured. */
export function supabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
