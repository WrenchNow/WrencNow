import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { RESET_COOKIE, RESET_COOKIE_OPTIONS } from "@/lib/password-reset";
import { createClient } from "@/lib/supabase/server";

// Handles OAuth sign-in and email confirmation links.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      if (next === "/reset-password") {
        const res = NextResponse.redirect(`${origin}/reset-password`);
        res.cookies.set(RESET_COOKIE, "1", RESET_COOKIE_OPTIONS);
        return res;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (!profile?.role) {
        return NextResponse.redirect(`${origin}/onboarding/role?next=${encodeURIComponent(next)}`);
      }
      return NextResponse.redirect(`${origin}${next === "/" ? (profile.role === "mechanic" ? "/mechanic/dashboard" : profile.role === "admin" ? "/admin" : "/account") : next}`);
    }
  }
  // An expired or reused password-reset link lands on the reset page, which offers a fresh link.
  if (next === "/reset-password") return NextResponse.redirect(`${origin}/reset-password`);
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
