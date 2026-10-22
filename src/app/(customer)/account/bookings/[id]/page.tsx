import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerBookingActions, ReviewForm } from "@/components/account/forms";
import { LiveRefresh } from "@/components/account/live-refresh";
import { StatusTimeline } from "@/components/account/status-timeline";
import { Stars } from "@/components/review-list";
import { Avatar } from "@/components/search/mechanic-card";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { noShowReportable } from "@/lib/booking-status";
import { syncBookingPayment } from "@/lib/bookings";
import { stripeConfigured } from "@/lib/env";
import { dateTime, money } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  // Back from Stripe: confirm the hold directly instead of waiting on the webhook.
  if (sp.paid === "1" && stripeConfigured()) {
    const { data: own } = await supabase.from("bookings").select("id, payment_status").eq("id", id).maybeSingle();
    if (own?.payment_status === "unpaid") await syncBookingPayment(own.id).catch((e) => console.error("syncBookingPayment", e));
  }
  const { data: b } = await supabase.from("bookings").select("*, services(name, icon), mechanics(display_name)").eq("id", id).maybeSingle();
  if (!b || (b.customer_id !== viewer.id && viewer.profile.role !== "admin")) notFound();
  const { data: review } = await supabase.from("reviews").select("rating, body").eq("booking_id", b.id).maybeSingle();
  const showArrival = b.status === "accepted" || b.status === "en_route";
  // RLS: only the customer can read the arrival code. Mechanic identity comes from the booking's own mechanic.
  const [{ data: code }, mech] = showArrival
    ? await Promise.all([
        supabase.from("booking_codes").select("code").eq("booking_id", b.id).maybeSingle(),
        createAdminClient().from("mechanics").select("display_name, photo_url, check_status, insurance_status").eq("id", b.mechanic_id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];

  const canCancel = b.status === "requested" || b.status === "accepted"; // matches canCancel("customer", …)
  const canNoShow = noShowReportable(b.status, b.scheduled_start);

  return (
    <>
      <LiveRefresh bookingId={b.id} />
      <PageHeader eyebrow="Booking" title={b.services?.name ?? "Booking"}>
        {dateTime(b.scheduled_start)} with{" "}
        <Link href={`/mechanics/${b.mechanic_id}`} className="text-ore hover:underline">
          {b.mechanics?.display_name ?? "your mechanic"}
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

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="mb-4 text-2xl font-bold uppercase">Details</h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label="Vehicle" value={b.vehicle_desc} />
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
            {b.final_amount_cents && <Detail label="Final amount" value={money(b.final_amount_cents)} />}
            {b.refunded_cents > 0 && <Detail label="Refunded" value={money(b.refunded_cents)} />}
            <Detail label="Status" value={PAYMENT_LABEL[b.payment_status] ?? b.payment_status} />
          </dl>
          <div className="mt-6">
            <CustomerBookingActions id={b.id} canCancel={canCancel} canNoShow={canNoShow} />
          </div>
        </Card>
      </div>

      {b.status === "completed" && (
        <Card className="mt-6">
          <h2 className="mb-4 text-2xl font-bold uppercase">Your review</h2>
          {review ? (
            <div>
              <Stars rating={review.rating} />
              {review.body && <p className="mt-2 text-sm text-ink">{review.body}</p>}
            </div>
          ) : (
            <ReviewForm bookingId={b.id} />
          )}
        </Card>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs tracking-wider text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-cream">{value}</dd>
    </div>
  );
}
