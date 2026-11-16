import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from "./config";

/** Keep the login session fresh on every sessions request. */
export async function refreshSession(request: NextRequest, response: NextResponse) {
  if (!supabaseConfigured) return response;
  let res = response;
  const client = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        res = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  await client.auth.getUser();
  return res;
}
