import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, locales } from "@/lib/i18n/config";
import { refreshSession } from "@/lib/supabase/proxy";

/** Send any un-prefixed path to the default locale: / → /en, /sessions → /en/sessions. */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLocale) {
    const res = NextResponse.next({ request });
    // the private side: keep the login session fresh
    return /^\/(en|es)\/sessions/.test(pathname) ? refreshSession(request, res) : res;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, route handlers, and anything with a file extension.
  matcher: ["/((?!_next|api|auth|assets|.*\\..*).*)"],
};
