import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { mechanicNetCents, verificationJobsRemaining } from "@/lib/fees";
import { verificationRefundPerJobCents } from "@/lib/env";
import { dateTime, monthKey, money } from "@/lib/format";
import { getMyMechanic } from "@/lib/mechanic";
import { createClient } from "@/lib/supabase/server";
import { openStripeDashboard } from "../actions";

export const metadata: Metadata = { title: "Earnings" };

export default async function EarningsPage() {
  const viewer = await requireRole(["mechanic"], "/mechanic/earnings");
  const supabase = await createClient();
  const [m, { data: jobs }] = await Promise.all([
    getMyMechanic(viewer.id),
    supabase
      .from("bookings")
      .select("id, completed_at, final_amount_cents, platform_fee_cents, refunded_cents, services(name)")
      .eq("mechanic_id", viewer.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(200),
  ]);

  const rows = (jobs ?? []).map((j) => {
    const gross = j.final_amount_cents ?? 0;
    const fee = j.platform_fee_cents ?? 0;
    return { ...j, gross, fee, net: mechanicNetCents(gross, fee, j.refunded_cents ?? 0) };
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
        Your share after the platform fee. Payouts land in your bank on Stripe&apos;s schedule.
      </PageHeader>

      {m?.verification_fee_status === "paid" && m.verification_refunded_cents < m.verification_paid_cents && (
        <div className="mb-6">
          <Notice tone="info" title="Verification fee refund">
            {money(m.verification_refunded_cents)} of your {money(m.verification_paid_cents)} returned ·{" "}
            {verificationJobsRemaining(m.verification_paid_cents, m.verification_refunded_cents, verificationRefundPerJobCents())} more completed job(s) to get the rest
            back. Refunds go to the card you paid with.
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
                <th className="px-4 py-3 text-right font-semibold">Fee</th>
                <th className="px-4 py-3 text-right font-semibold">You earn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-cream">{r.services?.name}</td>
                  <td className="px-4 py-3">{r.completed_at ? dateTime(r.completed_at) : "—"}</td>
                  <td className="px-4 py-3 text-right">{money(r.gross)}</td>
                  <td className="px-4 py-3 text-right text-muted">−{money(r.fee)}</td>
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
