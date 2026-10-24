"use client";

import { useState, useTransition } from "react";
import { approvePartsAction, declinePartsAction } from "@/app/(customer)/account/actions";
import { PaymentStep } from "@/components/booking/payment-step";
import { Button } from "@/components/ui/button";
import { Badge, Notice } from "@/components/ui/feedback";

export type CustomerPart = {
  id: string;
  name: string;
  part_number: string | null;
  quantity: number;
  quoted_unit_cents: number;
  status: "quoted" | "approved" | "declined" | "purchased" | "removed";
  receipt_cents: number | null;
  receipt_url: string | null;
};

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

export function PartsQuote({
  bookingId,
  parts,
  handlingBps,
  laborMax,
  newMax,
  approvedAt,
  publishableKey,
}: {
  bookingId: string;
  parts: CustomerPart[];
  handlingBps: number;
  laborMax: number;
  newMax: number;
  approvedAt: string | null;
  publishableKey: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [topup, setTopup] = useState<{ clientSecret: string; cents: number } | null>(null);
  const [pending, start] = useTransition();
  const quoted = parts.filter((p) => p.status === "quoted");
  const shown = parts.filter((p) => p.status !== "removed");
  if (shown.length === 0) return null;
  const quotedSubtotal = quoted.reduce((s, p) => s + p.quantity * p.quoted_unit_cents, 0);
  const handling = Math.round((quotedSubtotal * handlingBps) / 10000);

  function approve() {
    setError(null);
    start(async () => {
      const res = await approvePartsAction(bookingId);
      if (res.error) return setError(res.error);
      if (res.clientSecret) setTopup({ clientSecret: res.clientSecret, cents: res.topupCents ?? 0 });
    });
  }
  function decline() {
    setError(null);
    start(async () => {
      const res = await declinePartsAction(bookingId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y divide-line rounded-[var(--radius-control)] border border-line">
        {shown.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
            <span className="text-cream">
              {p.quantity} × {p.name}
              {p.part_number && <span className="text-muted"> · #{p.part_number}</span>}
            </span>
            <span className="flex items-center gap-2">
              {p.status === "purchased" ? (
                <>
                  <span className="text-cream">{usd(p.receipt_cents ?? 0)}</span>
                  {p.receipt_url ? (
                    <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="text-ore hover:underline">
                      Receipt
                    </a>
                  ) : (
                    <Badge tone="ok">Receipt on file</Badge>
                  )}
                </>
              ) : (
                <>
                  <span className="text-ink">{usd(p.quantity * p.quoted_unit_cents)}</span>
                  {p.status === "approved" && <Badge tone="ok">Approved</Badge>}
                  {p.status === "declined" && <Badge tone="danger">Declined</Badge>}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      {quoted.length > 0 && !topup && (
        <div className="rounded-[var(--radius-control)] border border-ore/40 bg-ore-dim p-4 text-sm">
          <p className="font-semibold text-cream">Your mechanic needs your OK before buying these parts.</p>
          <dl className="mt-2 grid max-w-sm grid-cols-2 gap-1">
            <dt className="text-ink">Parts (quoted)</dt>
            <dd className="text-right text-cream">{usd(quotedSubtotal)}</dd>
            <dt className="text-ink">Handling ({handlingBps / 100}%)</dt>
            <dd className="text-right text-cream">{usd(handling)}</dd>
            <dt className="text-ink">Labor (up to)</dt>
            <dd className="text-right text-cream">{usd(laborMax)}</dd>
            <dt className="font-semibold text-cream">New total, up to</dt>
            <dd className="text-right font-semibold text-cream">{usd(newMax)}</dd>
          </dl>
          <p className="mt-2 text-xs text-muted">You&apos;re charged the actual receipt prices, never more than these quotes. You&apos;ll see every receipt.</p>
          {error && (
            <div className="mt-3">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={approve} disabled={pending}>
              {pending ? "Working…" : "Approve parts"}
            </Button>
            <Button variant="subtle" onClick={decline} disabled={pending}>
              Decline
            </Button>
          </div>
        </div>
      )}

      {topup && publishableKey && (
        <div className="rounded-[var(--radius-control)] border border-line bg-raised p-4">
          <p className="mb-3 text-sm text-ink">This quote is more than your current card hold. Authorize the difference to approve it — you&apos;re still only charged the final receipt amounts.</p>
          <PaymentStep publishableKey={publishableKey} clientSecret={topup.clientSecret} bookingId={bookingId} amountLabel={usd(topup.cents)} returnQuery="topup=1" />
        </div>
      )}
      {topup && !publishableKey && <Notice tone="warn">Payments aren&apos;t connected yet.</Notice>}

      {approvedAt && quoted.length === 0 && <p className="text-xs text-muted">Parts approved in the app {new Date(approvedAt).toLocaleString("en-US", { timeZone: "America/Denver" })}.</p>}
    </div>
  );
}
