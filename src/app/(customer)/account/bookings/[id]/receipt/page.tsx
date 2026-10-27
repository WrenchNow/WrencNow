import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/account/forms";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { CONTACT_EMAIL } from "@/lib/contact";
import { dateTime, money, warrantyLabel } from "@/lib/format";
import { mechanicNames } from "@/lib/public-data";
import { formatRate } from "@/lib/sales-tax";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Receipt" };

/** Printable, itemized receipt for a completed job (Colorado repair invoices itemize parts and labor). */
export default async function ReceiptPage({ params }: PageProps<"/account/bookings/[id]/receipt">) {
  const { id } = await params;
  const viewer = await requireRole(["customer"], `/account/bookings/${id}/receipt`);
  const supabase = await createClient();
  const { data: b } = await supabase.from("bookings").select("*, services(name)").eq("id", id).maybeSingle();
  if (!b || (b.customer_id !== viewer.id && viewer.profile.role !== "admin") || b.status !== "completed") notFound();
  const [{ data: parts }, names] = await Promise.all([
    supabase.from("booking_parts").select("name, part_number, quantity, receipt_cents").eq("booking_id", b.id).eq("status", "purchased").order("created_at"),
    mechanicNames([b.mechanic_id]),
  ]);
  const net = (b.final_amount_cents ?? 0) - b.refunded_cents;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/account/bookings/${b.id}`} className="text-sm text-ore hover:underline">
          ← Back to booking
        </Link>
        <PrintButton />
      </div>
      <Card>
        <p className="font-display text-2xl font-bold text-cream uppercase">
          Wrench<span className="text-ore">Now</span> receipt
        </p>
        <p className="mt-1 text-sm text-muted">Reference {b.id.slice(0, 8).toUpperCase()}</p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <Row label="Service" value={b.services?.name ?? "Service"} />
          <Row label="Mechanic (independent contractor)" value={names.get(b.mechanic_id) ?? "Your mechanic"} />
          <Row label="Vehicle" value={b.odometer !== null ? `${b.vehicle_desc} · ${b.odometer.toLocaleString("en-US")} mi` : b.vehicle_desc} />
          <Row label="Where" value={b.address} />
          <Row label="Completed" value={b.completed_at ? dateTime(b.completed_at) : "—"} />
          {b.estimate_approved_at && <Row label="Estimate approved" value={`${dateTime(b.estimate_approved_at)} · up to ${money(b.labor_max_cents ?? b.estimated_max_cents)}`} />}
          {b.parts_approved_at && <Row label="Parts approved in app" value={dateTime(b.parts_approved_at)} />}
        </dl>

        <table className="mt-6 w-full text-left text-sm">
          <thead className="text-xs tracking-wider text-muted uppercase">
            <tr>
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {b.labor_cents !== null && (
              <tr>
                <td className="py-2 text-cream">Labor</td>
                <td className="py-2 text-right text-cream">{money(b.labor_cents)}</td>
              </tr>
            )}
            {(parts ?? []).map((p, i) => (
              <tr key={i}>
                <td className="py-2 text-cream">
                  {p.quantity} × {p.name}
                  {p.part_number ? <span className="text-muted"> · #{p.part_number}</span> : null} <span className="text-muted">(receipt price)</span>
                </td>
                <td className="py-2 text-right text-cream">{money(p.receipt_cents)}</td>
              </tr>
            ))}
            {b.parts_handling_cents ? (
              <tr>
                <td className="py-2 text-cream">Parts handling</td>
                <td className="py-2 text-right text-cream">{money(b.parts_handling_cents)}</td>
              </tr>
            ) : null}
            {b.sales_tax_cents ? (
              <tr>
                <td className="py-2 text-cream">
                  Sales tax on parts <span className="text-muted">({formatRate(b.tax_rate_mpct)}{b.tax_place ? `, ${b.tax_place}` : b.tax_county ? `, ${b.tax_county}` : ""})</span>
                </td>
                <td className="py-2 text-right text-cream">{money(b.sales_tax_cents)}</td>
              </tr>
            ) : null}
            {b.customer_no_show_fee_cents ? (
              <tr>
                <td className="py-2 text-cream">No-show fee</td>
                <td className="py-2 text-right text-cream">{money(b.customer_no_show_fee_cents)}</td>
              </tr>
            ) : null}
          </tbody>
          <tfoot className="border-t border-line-strong">
            <tr>
              <td className="pt-3 font-semibold text-cream">Total charged</td>
              <td className="pt-3 text-right font-semibold text-cream">{money(b.final_amount_cents)}</td>
            </tr>
            {b.refunded_cents > 0 && (
              <>
                <tr>
                  <td className="pt-1 text-ink">Refunded</td>
                  <td className="pt-1 text-right text-ink">−{money(b.refunded_cents)}</td>
                </tr>
                <tr>
                  <td className="pt-1 font-semibold text-cream">Net paid</td>
                  <td className="pt-1 text-right font-semibold text-cream">{money(net)}</td>
                </tr>
              </>
            )}
          </tfoot>
        </table>

        <div className="mt-6 space-y-1 text-xs text-muted">
          {b.return_old_parts && <p>Replaced parts were returned to you.</p>}
          {b.warranty_days ? <p>{warrantyLabel(b.warranty_days)} offered by your mechanic (not WrenchNow).</p> : null}
          {b.sales_tax_cents ? <p>Colorado sales tax is charged on parts only; labor isn&apos;t taxed. WrenchNow collects and remits it.</p> : null}
          <p>Paid by card through WrenchNow. Questions: {CONTACT_EMAIL}</p>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs tracking-wider text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-cream">{value}</dd>
    </div>
  );
}
