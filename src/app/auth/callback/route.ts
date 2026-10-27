import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
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
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (!profile?.role) {
        return NextResponse.redirect(`${origin}/onboarding/role?next=${encodeURIComponent(next)}`);
      }
      return NextResponse.redirect(`${origin}${next === "/" ? (profile.role === "mechanic" ? "/mechanic/dashboard" : profile.role === "admin" ? "/admin" : "/account") : next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
