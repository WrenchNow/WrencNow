import type { Metadata } from "next";
import { MechanicProfileForm, PhotoUpload, ServicesForm, SubmitApplicationForm } from "@/components/mechanic/forms";
import { Readiness } from "@/components/mechanic/readiness";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { stripeConfigured } from "@/lib/env";
import { getMyMechanic, readiness } from "@/lib/mechanic";
import { getServices } from "@/lib/public-data";
import { TIER_LABEL, tierRank } from "@/lib/tiers";
import { syncStripeAccount } from "@/lib/stripe-sync";
import { startStripeOnboarding } from "../actions";

export const metadata: Metadata = { title: "Profile & setup" };

export default async function MechanicOnboardingPage({ searchParams }: PageProps<"/mechanic/onboarding">) {
  const sp = await searchParams;
  const viewer = await requireRole(["mechanic"], "/mechanic/onboarding");
  if (sp.stripe === "return") await syncStripeAccount(viewer.id);
  const [m, services] = await Promise.all([getMyMechanic(viewer.id), getServices()]);
  if (!m) return <Notice tone="danger">We couldn&apos;t find your mechanic profile. Contact support.</Notice>;
  const steps = readiness(m);
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
          <Card>
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
                has_tools: m.has_tools,
                has_transport: m.has_transport,
              }}
            />
          </Card>

          <Card>
            <h2 className="text-2xl font-bold uppercase">2. Services you offer</h2>
            <p className="mt-1 mb-4 text-sm text-muted">Your current tier: {TIER_LABEL[m.skill_tier]}. New mechanics start at Basic until we review your experience.</p>
            <ServicesForm
              services={services.map((s) => ({ id: s.id, name: s.name, icon: s.icon, tier: TIER_LABEL[s.required_tier], rank: tierRank(s.required_tier) }))}
              selected={m.serviceIds}
              tierRank={tierRank(m.skill_tier)}
            />
          </Card>

          <Card>
            <h2 className="text-2xl font-bold uppercase">3. Submit & background check</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              When you submit, Checkr (our background check partner) emails you a secure link. They handle your SSN and consent — WrenchNow never sees it.
            </p>
            <SubmitApplicationForm submitted={Boolean(m.onboarding_submitted_at)} />
          </Card>

          <Card>
            <h2 className="text-2xl font-bold uppercase">4. Get paid</h2>
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
