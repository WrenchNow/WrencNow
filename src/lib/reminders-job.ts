import "server-only";
import { reminderIntervalDays, siteUrl } from "@/lib/env";
import { shortDate } from "@/lib/format";
import { emailConfigured, notifyUser } from "@/lib/notify";
import { dueReminders } from "@/lib/reminders";
import { createAdminClient } from "@/lib/supabase/admin";

/** Daily job: email customers whose opted-in cars are due. One email per car per oil-change cycle (deduped by key). */
export async function sendMaintenanceReminders(now = Date.now()) {
  if (!emailConfigured()) return { skipped: "email not configured" as const, due: 0 };
  const admin = createAdminClient();
  const { data: vehicles } = await admin.from("vehicles").select("id, owner_id, year, make, model, reminders_opt_in").eq("reminders_opt_in", true).limit(5000);
  if (!vehicles?.length) return { due: 0 };
  const { data: jobs } = await admin
    .from("bookings")
    .select("id, vehicle_id, completed_at, services(slug)")
    .eq("status", "completed")
    .in("vehicle_id", vehicles.map((v) => v.id));
  const due = dueReminders(
    vehicles.map((v) => ({ id: v.id, owner_id: v.owner_id, label: `${v.year} ${v.make} ${v.model}`, reminders_opt_in: v.reminders_opt_in })),
    (jobs ?? []).map((j) => ({ id: j.id, vehicle_id: j.vehicle_id, completed_at: j.completed_at, service_slug: j.services?.slug ?? null })),
    reminderIntervalDays(),
    now,
  );
  for (const d of due) {
    await notifyUser(`reminder:oil:${d.vehicleId}:${d.lastJobId}`, d.ownerId, {
      subject: `Your ${d.label} may be due for an oil change`,
      text: `It's been about ${Math.round(d.daysSince / 30)} months since your ${d.label}'s last oil change on WrenchNow (${shortDate(d.lastDoneAt)}). Check your owner's manual or oil-life reminder, and book a mobile oil change when you're ready: ${siteUrl()}/services/mobile-oil-change\n\nDon't want these? Turn off reminders in your garage: ${siteUrl()}/account/garage`,
    });
  }
  return { due: due.length };
}
