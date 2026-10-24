import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerBookingActions, OffPlatformReport, ReviewForm, WarrantyClaimForm } from "@/components/account/forms";
import { PartsQuote, type CustomerPart } from "@/components/account/parts-quote";
import { LiveRefresh } from "@/components/account/live-refresh";
import { StatusTimeline } from "@/components/account/status-timeline";
import { Stars } from "@/components/review-list";
import { Avatar } from "@/components/search/mechanic-card";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { customerNoShowAt, noShowReportable } from "@/lib/booking-status";
import { syncBookingPayment } from "@/lib/bookings";
import { customerNoShowFeeCents, minWarrantyDays, partsHandlingBps, stripeConfigured } from "@/lib/env";
import { receiptLinks, syncTopup } from "@/lib/parts";
import { partsChargeCents } from "@/lib/parts-math";
import { dateTime, money, timeOnly, warrantyLabel } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { mechanicNames } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";
import { photosFor } from "@/lib/job-photos";
import { PhotoGallery } from "@/components/job-photos";
import { effectiveWarrantyDays, inWarranty, warrantyEndsAt } from "@/lib/warranty";

export const metadata: Metadata = { title: "Booking" };

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "Waiting for payment",
  authorized: "Card hold placed — not charged yet",
  captured: "Paid",
  canceled: "Hold released — not charged",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  disputed: "Disputed",
  failed: "Payment failed",
};

export default async function BookingDetailPage({ params, searchParams }: PageProps<"/account/bookings/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const viewer = await requireRole(["customer"], `/account/bookings/${id}`);
  const supabase = await createClient();
  if (sp.topup === "1" && stripeConfigured()) {
    await syncTopup(id, viewer.id).catch((e) => console.error("syncTopup", e));
  }
  // Back from Stripe: confirm the hold directly instead of waiting on the webhook.
  if (sp.paid === "1" && stripeConfigured()) {
    const { data: own } = await supabase.from("bookings").select("id, payment_status").eq("id", id).maybeSingle();
    if (own?.payment_status === "unpaid") await syncBookingPayment(own.id).catch((e) => console.error("syncBookingPayment", e));
  }
  const { data: b } = await supabase.from("bookings").select("*, services(name, icon, slug)").eq("id", id).maybeSingle();
  if (!b || (b.customer_id !== viewer.id && viewer.profile.role !== "admin")) notFound();
  const mechanicName = (await mechanicNames([b.mechanic_id])).get(b.mechanic_id) ?? null;
  // One review per customer per mechanic — show theirs, whichever job it was left on.
  const { data: review } = await supabase.from("reviews").select("rating, body, booking_id").eq("customer_id", b.customer_id).eq("mechanic_id", b.mechanic_id).maybeSingle();
  const showArrival = b.status === "accepted" || b.status === "en_route";
  const { data: partRows } = await supabase.from("booking_parts").select("*").eq("booking_id", b.id).order("created_at");
  const links = await receiptLinks((partRows ?? []).map((p) => p.receipt_path).filter((x): x is string => Boolean(x)));
  const parts: CustomerPart[] = (partRows ?? []).map((p) => ({ ...p, receipt_url: p.receipt_path ? (links.get(p.receipt_path) ?? null) : null }));
  const handlingBps = partsHandlingBps();
  const quotedCost = parts.filter((p) => p.status === "quoted").reduce((s2, p) => s2 + p.quantity * p.quoted_unit_cents, 0);
  const boughtCost = parts.filter((p) => p.status === "purchased").reduce((s2, p) => s2 + (p.receipt_cents ?? 0), 0);
  const laborMax = b.labor_max_cents ?? b.estimated_max_cents;
  const quoteNewMax = laborMax + partsChargeCents(quotedCost + boughtCost, handlingBps);
  const warranty =
    b.status === "completed"
      ? effectiveWarrantyDays((await createAdminClient().from("mechanics").select("warranty_days").eq("id", b.mechanic_id).maybeSingle()).data?.warranty_days, minWarrantyDays())
      : null;
  const covered = warranty !== null && inWarranty(b.completed_at, warranty);
  const photos = (await photosFor([b.id])).get(b.id) ?? [];
  const { data: claims } = b.status === "completed" ? await supabase.from("warranty_claims").select("id, status, description, resolution, created_at").eq("booking_id", b.id).order("created_at", { ascending: false }) : { data: null };
  const openClaim = (claims ?? []).some((c) => c.status === "open" || c.status === "mechanic_contacted");
  // RLS: only the customer can read the arrival code. Mechanic identity comes from the booking's own mechanic.
  const [{ data: code }, mech] = showArrival
    ? await Promise.all([
        supabase.from("booking_codes").select("code").eq("booking_id", b.id).maybeSingle(),
        createAdminClient().from("mechanics").select("display_name, photo_url, check_status, insurance_status, profiles(phone)").eq("id", b.mechanic_id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];

  const canCancel = b.status === "requested" || b.status === "accepted"; // matches canCancel("customer", …)
  const canNoShow = noShowReportable(b.status, b.scheduled_start, b.arrived_at);
  const noShowDeadline = b.arrived_at && b.status === "en_route" ? customerNoShowAt(b.arrived_at, b.scheduled_start) : null;

  return (
    <>
      <LiveRefresh bookingId={b.id} />
      <PageHeader eyebrow="Booking" title={b.services?.name ?? "Booking"}>
        {dateTime(b.scheduled_start)} with{" "}
        <Link href={`/mechanics/${b.mechanic_id}`} className="text-ore hover:underline">
          {mechanicName ?? "your mechanic"}
        </Link>
      </PageHeader>

      {sp.paid === "1" && b.payment_status === "unpaid" && (
        <div className="mb-6">
          <Notice tone="info" title="Confirming your payment…">This page updates automatically once your card hold goes through.</Notice>
        </div>
      )}
      {b.status === "requested" && b.payment_status === "authorized" && (
        <div className="mb-6">
          <Notice tone="ok" title="Request sent">Your mechanic has been notified. You&apos;ll see it here the moment they accept.</Notice>
        </div>
      )}

      <Card className="mb-6">
        <StatusTimeline status={b.status} />
      </Card>

      {noShowDeadline && (
        <div className="mb-6">
          <Notice tone="warn" title="Your mechanic is here">
            They checked in at your address at {timeOnly(b.arrived_at!)}. Meet them and read them your arrival code. If you don&apos;t respond by{" "}
            {timeOnly(new Date(noShowDeadline).toISOString())}, they can mark you as a no-show and a {money(Math.min(customerNoShowFeeCents(), b.estimated_max_cents))} fee
            is charged to your card.
          </Notice>
        </div>
      )}

      {showArrival && code && (
        <Card className="mb-6 border-ore/40">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={mech.data?.display_name ?? null} url={mech.data?.photo_url ?? null} size={64} />
              <div>
                <p className="text-xs tracking-wider text-muted uppercase">Your mechanic</p>
                <p className="font-display text-2xl font-bold text-cream uppercase">{mech.data?.display_name ?? "Your mechanic"}</p>
                <p className="text-sm text-ok">
                  {mech.data?.check_status === "clear" && "✓ Background checked "}
                  {mech.data?.insurance_status === "verified" && "✓ Insured"}
                </p>
                {mech.data?.profiles?.phone && (
                  <p className="mt-1 text-sm">
                    <a href={`tel:${mech.data.profiles.phone}`} className="text-ore hover:underline">
                      Call
                    </a>
                    {" · "}
                    <a href={`sms:${mech.data.profiles.phone}`} className="text-ore hover:underline">
                      Text
                    </a>{" "}
                    <span className="text-muted">{mech.data.profiles.phone}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-xs tracking-wider text-muted uppercase">Arrival code</p>
              <p className="font-display text-5xl font-black tracking-[0.25em] text-ore" aria-label={`Arrival code ${code.code.split("").join(" ")}`}>
                {code.code}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-ink">
            When your mechanic arrives, check they match the photo and name above, then read them this code. They can&apos;t start the job without it.
            Never share it before they&apos;re in front of you.
          </p>
        </Card>
      )}

      {parts.some((p) => p.status !== "removed") && (
        <Card className="mb-6">
          <h2 className="mb-4 text-2xl font-bold uppercase">Parts</h2>
          <PartsQuote
            bookingId={b.id}
            parts={parts}
            handlingBps={handlingBps}
            laborMax={laborMax}
            newMax={quoteNewMax}
            approvedAt={b.parts_approved_at}
            publishableKey={stripeConfigured() ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY! : null}
          />
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="mb-4 text-2xl font-bold uppercase">Details</h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label="Vehicle" value={b.odometer !== null ? `${b.vehicle_desc} · ${b.odometer.toLocaleString("en-US")} mi` : b.vehicle_desc} />
            {b.car_location && <Detail label="Car is" value={`${{ driveway: "In the driveway", street: "On the street", garage: "In a garage", parking_lot: "In a parking lot" }[b.car_location] ?? b.car_location}${b.car_covered ? " (covered)" : ""}`} />}
            <Detail label="Where" value={b.address} />
            <Detail label="When" value={dateTime(b.scheduled_start)} />
            <Detail label="Rate" value={`${money(b.hourly_rate_cents)}/hr`} />
            {b.problem_description && (
              <div className="sm:col-span-2">
                <Detail label="What's going on" value={b.problem_description} />
              </div>
            )}
          </dl>
        </Card>
        <Card>
          <h2 className="mb-4 text-2xl font-bold uppercase">Payment</h2>
          <dl className="space-y-3 text-sm">
            <Detail label="Estimate (max)" value={money(b.estimated_max_cents)} />
            {b.parts_estimate_cents > 0 && !b.parts_approved_at && (
              <Detail label="Includes parts estimate" value={`about ${money(partsChargeCents(b.parts_estimate_cents, handlingBps))}`} />
            )}
            {b.estimate_approved_at && <Detail label="Estimate approved" value={dateTime(b.estimate_approved_at)} />}
            {b.customer_no_show_fee_cents ? (
              <Detail label="No-show fee" value={money(b.customer_no_show_fee_cents)} />
            ) : (
              b.final_amount_cents && (
                <>
                  {b.labor_cents !== null && <Detail label="Labor" value={money(b.labor_cents)} />}
                  {b.parts_cents !== null && b.parts_cents > 0 && <Detail label="Parts (at receipt cost)" value={money(b.parts_cents)} />}
                  {b.parts_handling_cents ? <Detail label="Parts handling" value={money(b.parts_handling_cents)} /> : null}
                  <Detail label="Total charged" value={money(b.final_amount_cents)} />
                </>
              )
            )}
            {b.return_old_parts && <Detail label="Old parts" value="Returned to you" />}
            {b.status === "completed" && warranty !== null && (
              <Detail
                label="Warranty"
                value={b.completed_at ? `${warrantyLabel(warranty)} — covered through ${dateTime(warrantyEndsAt(b.completed_at, warranty).toISOString())}` : warrantyLabel(warranty)}
              />
            )}
            {b.refunded_cents > 0 && <Detail label="Refunded" value={money(b.refunded_cents)} />}
            <Detail label="Status" value={PAYMENT_LABEL[b.payment_status] ?? b.payment_status} />
          </dl>
          <div className="mt-6">
            <CustomerBookingActions id={b.id} canCancel={canCancel} canNoShow={canNoShow} />
          </div>
          <p className="mt-6 text-xs text-muted">
            Only pay through WrenchNow — never cash, Venmo, Zelle, or other apps.{" "}
            <Link href="/payment-protection" className="text-ore hover:underline">
              Why it matters
            </Link>
          </p>
          <div className="mt-3">
            <OffPlatformReport bookingId={b.id} />
          </div>
        </Card>
      </div>

      {photos.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-4 text-2xl font-bold uppercase">Job photos</h2>
          <PhotoGallery photos={photos} />
        </Card>
      )}

      {b.status === "completed" && (covered || (claims && claims.length > 0)) && (
        <Card className="mt-6">
          <h2 className="text-2xl font-bold uppercase">Problem with this repair?</h2>
          <p className="mt-1 mb-4 text-sm text-ink">
            This work is covered by the{" "}
            <Link href="/guarantee" className="text-ore hover:underline">
              WrenchNow guarantee
            </Link>
            . Tell us what&apos;s wrong — we&apos;ll contact your mechanic and follow up within one business day.
          </p>
          {claims && claims.length > 0 && (
            <ul className="mb-4 space-y-2">
              {claims.map((c) => (
                <li key={c.id} className="rounded-[var(--radius-control)] border border-line bg-raised p-3 text-sm">
                  <p className="font-semibold text-cream">{CLAIM_LABEL[c.status] ?? c.status} · filed {dateTime(c.created_at)}</p>
                  <p className="mt-1 text-ink">{c.description}</p>
                  {c.resolution && <p className="mt-1 text-muted">WrenchNow: {c.resolution}</p>}
                </li>
              ))}
            </ul>
          )}
          {openClaim ? (
            <Notice tone="ok">We&apos;ve got your claim. Your mechanic has been told, and WrenchNow support will follow up within one business day.</Notice>
          ) : (
            covered && <WarrantyClaimForm bookingId={b.id} />
          )}
        </Card>
      )}

      {b.status === "completed" && (
        <Card className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold uppercase">Your review</h2>
            <ButtonLink href={`/book/${b.mechanic_id}?service=${b.services?.slug ?? ""}`} variant="subtle" size="sm">
              Book {mechanicName?.split(" ")[0] ?? "them"} again
            </ButtonLink>
          </div>
          {review && review.booking_id === b.id ? (
            <div>
              <Stars rating={review.rating} />
              {review.body && <p className="mt-2 text-sm text-ink">{review.body}</p>}
            </div>
          ) : (
            <>
              {review && (
                <p className="mb-3 text-sm text-muted">
                  You&apos;ve reviewed this mechanic before ({review.rating}★). Each customer has one review per mechanic — update it to reflect this job.
                </p>
              )}
              <ReviewForm bookingId={b.id} />
            </>
          )}
        </Card>
      )}
    </>
  );
}

const CLAIM_LABEL: Record<string, string> = {
  open: "Received",
  mechanic_contacted: "We've contacted your mechanic",
  resolved: "Resolved",
  denied: "Closed",
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs tracking-wider text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-cream">{value}</dd>
    </div>
  );
}
