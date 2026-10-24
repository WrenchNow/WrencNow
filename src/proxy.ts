import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Routes that need a signed-in user. Role checks happen in each section's layout.
const PROTECTED = ["/account", "/book", "/mechanic", "/admin", "/onboarding"];

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!userId && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    // Skip static assets, images, and webhooks (webhooks authenticate by signature, not session).
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/checks/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
