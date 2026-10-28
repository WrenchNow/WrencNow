import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { mechanicNetCents } from "@/lib/fees";
import { checkFeeRefundJobs, onboardingFeePerJobCents } from "@/lib/env";
import { dateTime, monthKey, money } from "@/lib/format";
import { getMyMechanic } from "@/lib/mechanic";
import { createClient } from "@/lib/supabase/server";
import { openStripeDashboard } from "../actions";

export const metadata: Metadata = { title: "Earnings" };

export default async function EarningsPage() {
  const viewer = await requireRole(["mechanic"], "/mechanic/earnings");
  const supabase = await createClient();
  const [m, { data: jobs }, { data: deductions }] = await Promise.all([
    getMyMechanic(viewer.id),
    supabase
      .from("bookings")
      .select("id, completed_at, final_amount_cents, platform_fee_cents, processing_fee_cents, onboarding_fee_cents, deduction_cents, sales_tax_cents, refunded_cents, services(name)")
      .eq("mechanic_id", viewer.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(200),
    supabase.from("mechanic_deductions").select("id, booking_id, reason, amount_cents, recovered_cents, created_at").eq("mechanic_id", viewer.id).order("created_at", { ascending: false }).limit(20),
  ]);

  // Warranty refunds WrenchNow paid itself don't reduce that job here; they show as a deduction on a later job instead.
  const platformRefunded = new Map<string, number>();
  for (const d of deductions ?? []) if (d.booking_id) platformRefunded.set(d.booking_id, (platformRefunded.get(d.booking_id) ?? 0) + d.amount_cents);
  const rows = (jobs ?? []).map((j) => {
    const gross = j.final_amount_cents ?? 0;
    const fee = (j.platform_fee_cents ?? 0) + (j.processing_fee_cents ?? 0);
    // Sales tax on parts goes to the state (via WrenchNow), never to the mechanic.
    const tax = j.sales_tax_cents ?? 0;
    const onboarding = j.onboarding_fee_cents ?? 0;
    const deduction = j.deduction_cents ?? 0;
    return { ...j, gross, fee, tax, onboarding, deduction, net: mechanicNetCents(gross, fee + tax + onboarding + deduction, Math.max((j.refunded_cents ?? 0) - (platformRefunded.get(j.id) ?? 0), 0)) };
  });
  const sum = (list: typeof rows) => list.reduce((a, r) => a + r.net, 0);
  const month = monthKey(new Date());
  const thisMonth = sum(rows.filter((r) => r.completed_at && monthKey(new Date(r.completed_at)) === month));

  return (
    <>
      <PageHeader
        eyebrow="Earnings"
        title="Your earnings"
        actions={
          m?.stripe_account_id ? (
            <form action={openStripeDashboard}>
              <Button type="submit" variant="subtle">
                Payouts on Stripe →
              </Button>
            </form>
          ) : undefined
        }
      >
        Your share after the platform fee and card processing. Sales tax on parts is collected and paid to the state by WrenchNow. Payouts land in your bank on Stripe&apos;s schedule.
      </PageHeader>
      <p className="-mt-4 mb-6 text-sm">
        <a href="/mechanic/earnings/csv" className="font-semibold text-ore hover:underline">
          Download all jobs as CSV
        </a>{" "}
        <span className="text-muted">(for your bookkeeping and taxes)</span>
      </p>

      {m && m.check_fee_paid_cents > 0 && (
        <div className="mb-6">
          <Notice tone="info" title="Background check fee refunds">
            {m.check_fee_refunded_cents >= m.check_fee_paid_cents
              ? `All ${money(m.check_fee_paid_cents, { whole: true })} refunded to your card. Thanks for getting verified!`
              : `${money(m.check_fee_refunded_cents)} of ${money(m.check_fee_paid_cents)} refunded so far. ${money(onboardingFeePerJobCents(), { whole: true })} goes back to the card you paid with after each completed job (first ${checkFeeRefundJobs()} jobs).`}
          </Notice>
        </div>
      )}
      {deductions && deductions.some((d) => d.recovered_cents < d.amount_cents) && (
        <div className="mb-6">
          <Notice tone="warn" title="Deductions from upcoming payouts">
            <ul className="mt-1 space-y-1">
              {deductions
                .filter((d) => d.recovered_cents < d.amount_cents)
                .map((d) => (
                  <li key={d.id}>
                    {money(d.amount_cents - d.recovered_cents)} still to come out of your next job{d.recovered_cents > 0 ? "s" : ""}: {d.reason}
                  </li>
                ))}
            </ul>
          </Notice>
        </div>
      )}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs tracking-wider text-muted uppercase">This month</p>
          <p className="mt-1 font-display text-3xl font-bold text-cream">{money(thisMonth)}</p>
        </Card>
        <Card>
          <p className="text-xs tracking-wider text-muted uppercase">All time</p>
          <p className="mt-1 font-display text-3xl font-bold text-cream">{money(sum(rows))}</p>
        </Card>
        <Card>
          <p className="text-xs tracking-wider text-muted uppercase">Completed jobs</p>
          <p className="mt-1 font-display text-3xl font-bold text-cream">{rows.length}</p>
        </Card>
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-raised text-xs tracking-wider text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Job</th>
                <th className="px-4 py-3 font-semibold">Completed</th>
                <th className="px-4 py-3 text-right font-semibold">Charged</th>
                <th className="px-4 py-3 text-right font-semibold">Fees</th>
                <th className="px-4 py-3 text-right font-semibold">You earn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-cream">{r.services?.name}</td>
                  <td className="px-4 py-3">{r.completed_at ? dateTime(r.completed_at) : "—"}</td>
                  <td className="px-4 py-3 text-right">{money(r.gross)}</td>
                  <td className="px-4 py-3 text-right text-muted">
                    −{money(r.fee)}
                    {r.tax > 0 && <span className="block text-xs">−{money(r.tax)} sales tax</span>}
                    {r.onboarding > 0 && <span className="block text-xs">−{money(r.onboarding)} check fee</span>}
                    {r.deduction > 0 && <span className="block text-xs">−{money(r.deduction)} deduction</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-cream">{money(r.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="💵" title="No earnings yet">
          Completed jobs and your payouts will show up here.
        </EmptyState>
      )}
    </>
  );
}
