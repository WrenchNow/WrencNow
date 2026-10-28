import type { Metadata } from "next";
import { InsuranceForm, MechanicProfileForm, PhotoUpload, ServicesForm, SubmitApplicationForm, TypicalPartsForm } from "@/components/mechanic/forms";
import { Readiness } from "@/components/mechanic/readiness";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { recordCheckFeePayment } from "@/lib/check-fee";
import { checkFeeRefundJobs, onboardingFeePerJobCents, onboardingFeeTotalCents, stripeConfigured } from "@/lib/env";
import { money } from "@/lib/format";
import { getStripe } from "@/lib/stripe";
import { getMyMechanic, readiness } from "@/lib/mechanic";
import { getServices } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";
import { TIER_LABEL, tierRank } from "@/lib/tiers";
import { syncStripeAccount } from "@/lib/stripe-sync";
import { startCheckFeeCheckout, startStripeOnboarding } from "../actions";

export const metadata: Metadata = { title: "Profile & setup" };

export default async function MechanicOnboardingPage({ searchParams }: PageProps<"/mechanic/onboarding">) {
  const sp = await searchParams;
  const viewer = await requireRole(["mechanic"], "/mechanic/onboarding");
  if (sp.stripe === "return") await syncStripeAccount(viewer.id);
  // Back from paying the background check fee: record it now rather than waiting for the webhook.
  if (sp.check === "paid" && typeof sp.session_id === "string" && sp.session_id.startsWith("cs_") && stripeConfigured()) {
    const session = await getStripe().checkout.sessions.retrieve(sp.session_id).catch(() => null);
    if (session?.metadata?.mechanic_id === viewer.id) await recordCheckFeePayment(session);
  }
  const [m, services] = await Promise.all([getMyMechanic(viewer.id), getServices()]);
  if (!m) return <Notice tone="danger">We couldn&apos;t find your mechanic profile. Contact support.</Notice>;
  const steps = readiness(m);
  const { data: priceRows } = await (await createClient()).from("mechanic_services").select("service_id, typical_parts_cents").eq("mechanic_id", viewer.id);
  const partsPrices = new Map((priceRows ?? []).map((r) => [r.service_id, r.typical_parts_cents]));
  const stripeDone = m.stripe_charges_enabled && m.stripe_payouts_enabled;

  return (
    <>
      <PageHeader eyebrow="Profile & setup" title="Get ready to take jobs">
        Work through the checklist. You go live automatically once every step is done.
      </PageHeader>

      {sp.stripe === "return" && !stripeDone && (
        <div className="mb-6">
          <Notice tone="warn" title="Stripe setup isn't finished">Stripe still needs a few details before you can get paid. Continue where you left off below.</Notice>
        </div>
      )}
      {sp.stripe === "not-configured" && (
        <div className="mb-6">
          <Notice tone="warn" title="Payouts aren't connected yet">We&apos;re finishing payment setup on our side. Check back soon.</Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card id="profile" className="scroll-mt-24">
            <h2 className="mb-4 text-2xl font-bold uppercase">1. Your profile</h2>
            <div className="mb-6">
              <PhotoUpload userId={viewer.id} current={m.photo_url} />
            </div>
            <MechanicProfileForm
              d={{
                display_name: m.display_name ?? viewer.profile.full_name ?? "",
                phone: viewer.profile.phone ?? "",
                bio: m.bio ?? "",
                years_experience: m.years_experience,
                certifications: m.certifications,
                specialties: m.specialties,
                hourly_rate: m.hourly_rate_cents ? m.hourly_rate_cents / 100 : null,
                base_location: m.city ?? "",
                service_radius_miles: m.service_radius_miles,
                warranty_days: m.warranty_days,
                warranty_covers: m.warranty_covers as "labor" | "parts" | "both",
                estimate_fee: m.estimate_fee_cents === null ? null : m.estimate_fee_cents / 100,
                has_tools: m.has_tools,
                has_transport: m.has_transport,
              }}
            />
          </Card>

          <Card id="services" className="scroll-mt-24">
            <h2 className="text-2xl font-bold uppercase">2. Services you offer</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              Your current tier: {TIER_LABEL[m.skill_tier]}. Everyone starts at Basic. Higher tiers unlock after WrenchNow reviews your experience, successful first
              repairs, and customer reviews.
            </p>
            <ServicesForm
              services={services.map((s) => ({ id: s.id, name: s.name, icon: s.icon, tier: TIER_LABEL[s.required_tier], rank: tierRank(s.required_tier) }))}
              selected={m.serviceIds}
              tierRank={tierRank(m.skill_tier)}
            />
            <details className="mt-6 border-t border-line pt-5">
              <summary className="cursor-pointer text-lg font-bold text-cream uppercase">
                Typical parts cost <span className="text-sm font-normal text-muted normal-case">(optional)</span>
              </summary>
              <div className="mt-3">
                <TypicalPartsForm
                  services={services
                    .filter((s) => m.serviceIds.includes(s.id))
                    .map((s) => ({ id: s.id, name: s.name, icon: s.icon, typical_parts_cents: partsPrices.get(s.id) ?? null }))}
                />
              </div>
            </details>
          </Card>

          <Card id="submit" className="scroll-mt-24">
            <h2 className="text-2xl font-bold uppercase">3. Submit your application</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              WrenchNow reviews every application: your photo, profile, experience and insurance. We&apos;ll assign your skill tier and email you when you&apos;re approved.
            </p>
            <SubmitApplicationForm submitted={Boolean(m.onboarding_submitted_at)} />
          </Card>

          <Card id="check" className="scroll-mt-24">
            <h2 className="text-2xl font-bold uppercase">
              4. Background check <span className="text-base font-semibold text-muted normal-case">(optional)</span>
            </h2>
            <p className="mt-1 text-sm text-ink">
              Get the <span className="font-semibold text-ok">✓ Background checked</span> badge on your profile and in search. Customers trust it, and mechanics without
              it are shown as &ldquo;Not background checked&rdquo; — customers have to confirm that before they can book you.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-ink">
              <li>
                • You pay {money(onboardingFeeTotalCents(), { whole: true })} up front for the check (run by Checkr, our background check partner).
              </li>
              <li>
                • You get {money(onboardingFeePerJobCents(), { whole: true })} back on each completed job for your first {checkFeeRefundJobs()} jobs — the whole fee comes
                back to your card.
              </li>
              <li>• Checkr emails you a secure link for your consent and details. WrenchNow never sees your SSN.</li>
            </ul>
            <div className="mt-4">
              {sp.check === "cancelled" && (
                <div className="mb-3">
                  <Notice tone="info">Payment cancelled — nothing was charged. You can get checked any time.</Notice>
                </div>
              )}
              {sp.check === "not-configured" && (
                <div className="mb-3">
                  <Notice tone="warn">Payments aren&apos;t connected yet. Check back soon.</Notice>
                </div>
              )}
              {m.check_status === "clear" ? (
                <Notice tone="ok" title="Background checked">
                  Your badge is showing.
                  {m.check_fee_paid_cents > 0 &&
                    ` ${money(m.check_fee_refunded_cents)} of ${money(m.check_fee_paid_cents)} refunded so far — the rest comes back with your next completed jobs.`}
                </Notice>
              ) : m.check_fee_payment_intent_id ? (
                <Notice tone="info" title="Paid — thanks!">
                  {m.onboarding_submitted_at
                    ? m.check_status === "not_started"
                      ? "We're starting your check. Watch your email for the Checkr link."
                      : "Your check is with Checkr. Watch your email for their link and updates."
                    : "Your check starts as soon as you submit your application above."}
                </Notice>
              ) : (
                <form action={startCheckFeeCheckout}>
                  <Button type="submit" disabled={!stripeConfigured()}>
                    Get background checked — {money(onboardingFeeTotalCents(), { whole: true })}
                  </Button>
                </form>
              )}
            </div>
          </Card>

          <Card id="insurance" className="scroll-mt-24">
            <h2 className="text-2xl font-bold uppercase">5. Proof of insurance</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              You need your own liability insurance to work on customers&apos; cars. We verify the certificate before you go live, and you&apos;ll need to upload a new one
              before it expires.
            </p>
            {m.insurance_status === "verified" && (
              <div className="mb-4">
                <Notice tone="ok" title={`Verified through ${m.insurance_expires_on}`}>
                  {m.insurance_pending_expires_on ? "Your renewal is being reviewed — you stay live in the meantime." : "Upload your renewal here before it expires."}
                </Notice>
              </div>
            )}
            {m.insurance_status === "submitted" && (
              <div className="mb-4">
                <Notice tone="info" title="Submitted">We&apos;re verifying your certificate.</Notice>
              </div>
            )}
            {m.insurance_status === "rejected" && (
              <div className="mb-4">
                <Notice tone="danger" title="We couldn't verify your insurance">Upload a current certificate that shows your name and liability coverage.</Notice>
              </div>
            )}
            <InsuranceForm userId={viewer.id} defaults={{ provider: m.insurance_provider ?? "", policy: m.insurance_policy_number ?? "" }} />
          </Card>

          <Card id="payouts" className="scroll-mt-24">
            <h2 className="text-2xl font-bold uppercase">6. Get paid</h2>
            <p className="mt-1 mb-4 text-sm text-muted">Payouts go through Stripe. Takes about 5 minutes — have your bank details ready.</p>
            {stripeDone ? (
              <Notice tone="ok" title="Payouts connected">You&apos;re all set to get paid.</Notice>
            ) : (
              <form action={startStripeOnboarding}>
                <Button type="submit" disabled={!stripeConfigured()}>
                  {m.stripe_account_id ? "Continue Stripe setup" : "Set up payouts with Stripe"}
                </Button>
              </form>
            )}
          </Card>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Readiness steps={steps} live={Boolean(m.is_live)} />
        </aside>
      </div>
    </>
  );
}
