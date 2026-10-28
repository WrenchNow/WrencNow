import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { earningsCsv } from "@/lib/earnings-csv";
import { createClient } from "@/lib/supabase/server";

// Download of the signed-in mechanic's completed jobs (RLS limits rows to their own bookings).
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer || viewer.profile?.role !== "mechanic") return NextResponse.redirect(new URL("/login?next=/mechanic/earnings", request.url));
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, completed_at, final_amount_cents, platform_fee_cents, processing_fee_cents, onboarding_fee_cents, deduction_cents, sales_tax_cents, refunded_cents, services(name)")
    .eq("mechanic_id", viewer.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(5000);
  const { data: platformRefunds } = await supabase.from("mechanic_deductions").select("booking_id, amount_cents").eq("mechanic_id", viewer.id).not("booking_id", "is", null);
  const byBooking = new Map<string, number>();
  for (const d of platformRefunds ?? []) byBooking.set(d.booking_id!, (byBooking.get(d.booking_id!) ?? 0) + d.amount_cents);
  const csv = earningsCsv((data ?? []).map((b) => ({ ...b, service: b.services?.name ?? null, platform_refunded_cents: byBooking.get(b.id) ?? 0 })));
  return new NextResponse(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="wrenchnow-earnings.csv"', "cache-control": "no-store" },
  });
}
