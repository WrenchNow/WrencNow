import type { Metadata } from "next";
import Link from "next/link";
import { InsuranceReviewForm, ReviewMechanicForm } from "@/components/admin-forms";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { money, shortDate } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIER_LABEL } from "@/lib/tiers";

export const metadata: Metadata = { title: "Admin · Mechanics" };

const FILTERS = [
  { key: "review", label: "To review" },
  { key: "live", label: "Live" },
  { key: "all", label: "All" },
];

const CHECK_TONE = { clear: "ok", consider: "danger", suspended: "danger", canceled: "danger", pending: "info", invited: "info", not_started: "neutral" } as const;

export default async function AdminMechanicsPage({ searchParams }: PageProps<"/admin/mechanics">) {
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.key === sp.filter) ? (sp.filter as string) : "review";
  await requireAdmin();
  const admin = createAdminClient();
  let q = admin.from("mechanics").select("*, profiles(full_name, phone)").order("onboarding_submitted_at", { ascending: true, nullsFirst: false }).limit(200);
  if (filter === "review") q = q.or("and(status.eq.pending,onboarding_submitted_at.not.is.null),insurance_status.eq.submitted,insurance_pending_expires_on.not.is.null");
  if (filter === "live") q = q.eq("is_live", true);
  const { data: mechanics } = await q;
  // Short-lived links to private insurance certificates.
  const docLinks = new Map<string, string>();
  await Promise.all(
    (mechanics ?? [])
      .filter((m) => m.insurance_doc_path)
      .map(async (m) => {
        const { data } = await admin.storage.from("mechanic-docs").createSignedUrl(m.insurance_doc_path!, 600).catch(() => ({ data: null }));
        if (data?.signedUrl) docLinks.set(m.id, data.signedUrl);
      }),
  );

  return (
    <>
      <PageHeader eyebrow="Admin" title="Mechanics">
        Background check results come straight from Checkr. Approve and assign a tier once the check is clear.
      </PageHeader>
      <div className="mb-6 flex gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/admin/mechanics?filter=${f.key}`} className={`rounded-full border px-3 py-1.5 text-sm ${filter === f.key ? "border-ore bg-ore-dim text-cream" : "border-line-strong text-ink"}`}>
            {f.label}
          </Link>
        ))}
      </div>
      {mechanics && mechanics.length > 0 ? (
        <ul className="space-y-4">
          {mechanics.map((m) => (
            <li key={m.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
                <div className="min-w-0">
                  <h3 className="text-xl font-bold uppercase">{m.display_name ?? m.profiles?.full_name ?? "Unnamed"}</h3>
                  <p className="text-sm text-muted">
                    {m.city ?? "No location"} · {m.years_experience ?? "?"} yrs · {money(m.hourly_rate_cents, { whole: true })}/hr · applied {m.onboarding_submitted_at ? shortDate(m.onboarding_submitted_at) : "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={CHECK_TONE[m.check_status]}>Check: {m.check_status.replace("_", " ")}</Badge>
                    <Badge tone={m.stripe_charges_enabled && m.stripe_payouts_enabled ? "ok" : "neutral"}>Stripe: {m.stripe_charges_enabled && m.stripe_payouts_enabled ? "ready" : m.stripe_account_id ? "incomplete" : "not started"}</Badge>
                    <Badge tone="ore">{TIER_LABEL[m.skill_tier]}</Badge>
                    <Badge tone={m.insurance_status === "verified" ? "ok" : m.insurance_status === "rejected" ? "danger" : m.insurance_status === "submitted" ? "info" : "neutral"}>
                      Insurance: {m.insurance_status}
                      {m.insurance_expires_on ? ` · exp ${m.insurance_expires_on}` : ""}
                    </Badge>
                    {m.is_live && <Badge tone="ok">● Live</Badge>}
                  </div>
                  {(m.insurance_status === "submitted" || m.insurance_pending_expires_on) && (
                    <div className="mt-3 rounded-[var(--radius-control)] border border-line-strong bg-raised p-3 text-sm">
                      <p className="font-semibold text-cream">{m.insurance_status === "verified" ? "Insurance renewal to review" : "Insurance to review"}</p>
                      <p className="mt-1 text-ink">
                        {m.insurance_provider} · policy {m.insurance_policy_number} · mechanic says it expires {m.insurance_pending_expires_on ?? "—"}
                      </p>
                      {docLinks.get(m.id) ? (
                        <a href={docLinks.get(m.id)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-ore hover:underline">
                          Open certificate (link valid 10 min) →
                        </a>
                      ) : (
                        <p className="mt-1 text-muted">Certificate file unavailable.</p>
                      )}
                      <div className="mt-3">
                        <InsuranceReviewForm id={m.id} pendingExpiry={m.insurance_pending_expires_on} />
                      </div>
                    </div>
                  )}
                  {m.certifications.length > 0 && <p className="mt-2 text-sm text-ink">Certs: {m.certifications.join(", ")}</p>}
                  {m.bio && <p className="mt-2 line-clamp-3 max-w-2xl text-sm text-ink">{m.bio}</p>}
                </div>
                <div className="shrink-0">
                  <ReviewMechanicForm id={m.id} status={m.status} tier={m.skill_tier} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="🧰" title="Nothing here">
          {filter === "review" ? "No applications or insurance certificates waiting for review." : "No mechanics match this filter."}
        </EmptyState>
      )}
    </>
  );
}
