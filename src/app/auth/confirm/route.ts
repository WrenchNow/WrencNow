import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { homeFor, safeNext } from "@/lib/auth";
import { RESET_COOKIE, RESET_COOKIE_OPTIONS } from "@/lib/password-reset";
import { createClient } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

// Links in WrenchNow's auth emails (token_hash flow). Unlike the code flow in /auth/callback, these work
// when the email is opened on a different device or browser than the one that asked for it.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"), "/");

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error && data.user) {
      if (type === "recovery") {
        const res = NextResponse.redirect(`${origin}/reset-password`);
        res.cookies.set(RESET_COOKIE, "1", RESET_COOKIE_OPTIONS);
        return res;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (!profile?.role) return NextResponse.redirect(`${origin}/onboarding/role?next=${encodeURIComponent(next)}`);
      return NextResponse.redirect(`${origin}${next === "/" ? homeFor(profile.role) : next}`);
    }
  }
  if (type === "recovery") return NextResponse.redirect(`${origin}/reset-password`);
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
