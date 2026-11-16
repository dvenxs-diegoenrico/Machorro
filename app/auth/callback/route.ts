import { NextResponse, type NextRequest } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";

/** The email link lands here: swap the one-time code for a session, then go on. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/en/sessions";
  // only ever redirect inside this site
  const safe = /^\/(en|es)\/sessions(\/[\w-]*)*$/.test(next) ? next : "/en/sessions";
  if (code && supabaseConfigured) {
    const sb = await serverSupabase();
    await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(safe, url.origin));
}
