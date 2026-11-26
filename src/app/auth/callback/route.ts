import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { safeNextPath } from "@/lib/safe-next";

// OAuth return leg: exchange the code for a session cookie, then continue to the game.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"));
  const fail = (msg: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}&next=${encodeURIComponent(next)}`, url.origin));

  // Supabase sends the error here when our database domain gate rejects the account.
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (oauthError) return fail(oauthError);

  const code = url.searchParams.get("code");
  if (!code) return fail("Sign-in was cancelled.");

  const store = await cookies();
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => store.set(name, value, options)),
    },
  });
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);
  return NextResponse.redirect(new URL(next, url.origin));
}
