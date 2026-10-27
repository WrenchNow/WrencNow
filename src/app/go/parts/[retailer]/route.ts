import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { isRetailer, partsRetailerUrl } from "@/lib/parts-retailers";
import { createAdminClient } from "@/lib/supabase/admin";

// Mechanic "price check" link: log the click, then send them to the store's search (with affiliate tracking if set).
export async function GET(request: NextRequest, { params }: { params: Promise<{ retailer: string }> }) {
  const { retailer } = await params;
  if (!isRetailer(retailer)) return NextResponse.json({ error: "unknown store" }, { status: 404 });
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 200);
  if (!query) return NextResponse.json({ error: "missing search" }, { status: 400 });

  const viewer = await getViewer();
  if (!viewer) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  const bookingId = request.nextUrl.searchParams.get("b");
  // Only mechanics' clicks are logged; anyone else signed in just goes to the store.
  if (viewer.profile?.role === "mechanic") {
    const admin = createAdminClient();
    // Only attach the booking if it's this mechanic's.
    const { data: own } = bookingId && /^[0-9a-f-]{36}$/i.test(bookingId) ? await admin.from("bookings").select("id").eq("id", bookingId).eq("mechanic_id", viewer.id).maybeSingle() : { data: null };
    await admin.from("parts_link_clicks").insert({ mechanic_id: viewer.id, booking_id: own?.id ?? null, retailer, query });
  }

  const key = retailer.toUpperCase();
  const url = partsRetailerUrl(retailer, query, {
    searchOverride: process.env[`PARTS_SEARCH_${key}`],
    affiliateTemplate: process.env[`PARTS_AFFILIATE_${key}`],
  });
  return NextResponse.redirect(url, { headers: { "Referrer-Policy": "no-referrer-when-downgrade", "X-Robots-Tag": "noindex" } });
}
