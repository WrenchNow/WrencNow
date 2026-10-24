import "server-only";
import { BookingError } from "@/lib/booking-error";
import { createAdminClient } from "@/lib/supabase/admin";

export const PHOTO_KINDS = ["before", "after"] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];
export const MAX_PHOTOS_PER_KIND = 6;
const PHOTO_STATUSES = ["accepted", "en_route", "in_progress"];

/** Mechanic attaches an uploaded photo to their active job. */
export async function recordJobPhoto(bookingId: string, mechanicId: string, kind: PhotoKind, path: string) {
  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select("id, mechanic_id, status").eq("id", bookingId).maybeSingle();
  if (!b || b.mechanic_id !== mechanicId) throw new BookingError("Booking not found.");
  if (!PHOTO_STATUSES.includes(b.status)) throw new BookingError("Photos can only be added while the job is active.");
  if (!path.startsWith(`${mechanicId}/${bookingId}/`) || path.includes("..")) throw new BookingError("Upload failed. Please try again.");
  const { count } = await admin.from("booking_photos").select("*", { count: "exact", head: true }).eq("booking_id", bookingId).eq("kind", kind);
  if ((count ?? 0) >= MAX_PHOTOS_PER_KIND) throw new BookingError(`Up to ${MAX_PHOTOS_PER_KIND} ${kind} photos per job.`);
  const { error } = await admin.from("booking_photos").insert({ booking_id: bookingId, mechanic_id: mechanicId, kind, path });
  if (error?.message.includes("booking_photos_limit")) throw new BookingError(`Up to ${MAX_PHOTOS_PER_KIND} ${kind} photos per job.`);
  if (error) throw new BookingError("Couldn't save that photo. Please try again.");
}

export async function removeJobPhoto(bookingId: string, mechanicId: string, photoId: string) {
  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select("mechanic_id, status").eq("id", bookingId).maybeSingle();
  if (!b || b.mechanic_id !== mechanicId) throw new BookingError("Booking not found.");
  if (!PHOTO_STATUSES.includes(b.status)) throw new BookingError("Photos are locked once the job is finished.");
  const { data: p } = await admin.from("booking_photos").delete().eq("id", photoId).eq("booking_id", bookingId).select("path").maybeSingle();
  if (p) await admin.storage.from("job-photos").remove([p.path]);
}

/** Photos for the given bookings with short-lived view links, grouped by booking. */
export async function photosFor(bookingIds: string[]) {
  const out = new Map<string, { id: string; kind: PhotoKind; url: string }[]>();
  if (bookingIds.length === 0) return out;
  const admin = createAdminClient();
  const { data: rows } = await admin.from("booking_photos").select("id, booking_id, kind, path").in("booking_id", bookingIds).order("created_at");
  if (!rows?.length) return out;
  const { data: signed } = await admin.storage.from("job-photos").createSignedUrls(
    rows.map((r) => r.path),
    600,
  );
  const urlFor = new Map((signed ?? []).filter((s) => s.signedUrl && s.path).map((s) => [s.path!, s.signedUrl]));
  for (const r of rows) {
    const url = urlFor.get(r.path);
    if (!url) continue;
    out.set(r.booking_id, [...(out.get(r.booking_id) ?? []), { id: r.id, kind: r.kind as PhotoKind, url }]);
  }
  return out;
}
