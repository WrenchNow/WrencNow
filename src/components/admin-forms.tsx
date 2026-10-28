"use client";

import { useActionState, useState } from "react";
import { adminCancelBooking, markTaxReviewed, refundBooking, resolvePaymentReport, reviewInsurance, updateJobIssue, setOpenRequestStatus, reviewMechanic, waiveOnboardingFee, warrantyRefund, type FormState } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Checkbox, Input, Select } from "@/components/ui/form";
import { APPROVAL_CHECKLIST } from "@/lib/approval-checklist";

function Msg({ s }: { s: FormState }) {
  if (s.error) return <Notice tone="danger">{s.error}</Notice>;
  if (s.message) return <Notice tone="ok">{s.message}</Notice>;
  return null;
}

export function ReviewMechanicForm({ id, status, tier }: { id: string; status: string; tier: string }) {
  const [s, action, pending] = useActionState(reviewMechanic, {});
  const [next, setNext] = useState(status);
  const approving = next === "approved" && status !== "approved";
  return (
    <form action={action} className="flex flex-col gap-2">
      <Msg s={s} />
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">
          Status
          <Select name="status" value={next} onChange={(e) => setNext(e.target.value)} className="mt-1 py-2">
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paused">Paused</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </Select>
        </label>
        <label className="text-xs text-muted">
          Skill tier
          <Select name="skill_tier" defaultValue={tier} className="mt-1 py-2">
            <option value="basic">Basic</option>
            <option value="certified">Certified</option>
            <option value="master">Master</option>
          </Select>
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          Save
        </Button>
      </div>
      {approving && (
        <fieldset className="mt-1 flex max-w-sm flex-col gap-2 rounded-[var(--radius-control)] border border-line-strong bg-raised p-3">
          <legend className="px-1 text-xs font-semibold text-cream">Verify before approving</legend>
          {APPROVAL_CHECKLIST.map((c) => (
            <Checkbox key={c.key} id={`${id}-${c.key}`} name={`check_${c.key}`} required label={c.label} />
          ))}
        </fieldset>
      )}
    </form>
  );
}

export function RefundForm({ id, maxLabel }: { id: string; maxLabel: string }) {
  const [s, action, pending] = useActionState(refundBooking, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <Msg s={s} />
      <input type="hidden" name="id" value={id} />
      <div className="flex items-end gap-2">
        <label className="text-xs text-muted">
          Refund amount (blank = {maxLabel})
          <Input name="amount" type="number" step="0.01" min="0.01" className="mt-1 w-36 py-2" />
        </label>
        <Button type="submit" size="sm" variant="danger" disabled={pending}>
          Refund
        </Button>
      </div>
    </form>
  );
}

export function AdminCancelForm({ id }: { id: string }) {
  const [s, action, pending] = useActionState(adminCancelBooking, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <Msg s={s} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="subtle" disabled={pending}>
        Cancel booking
      </Button>
    </form>
  );
}

export function InsuranceReviewForm({ id, pendingExpiry }: { id: string; pendingExpiry: string | null }) {
  const [s, action, pending] = useActionState(reviewInsurance, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <Msg s={s} />
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">
          Expires on (check the certificate)
          <Input name="expires_on" type="date" defaultValue={pendingExpiry ?? ""} className="mt-1 py-2" />
        </label>
        <Button type="submit" name="decision" value="verified" size="sm" disabled={pending}>
          Verify
        </Button>
        <Button type="submit" name="decision" value="rejected" size="sm" variant="danger" disabled={pending}>
          Reject
        </Button>
      </div>
    </form>
  );
}

export function WaiveFeeForm({ id }: { id: string }) {
  const [s, action, pending] = useActionState(waiveOnboardingFee, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <Msg s={s} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="subtle" disabled={pending}>
        Waive rest of check fee
      </Button>
    </form>
  );
}

export function ResolveReportForm({ id }: { id: string }) {
  const [s, action, pending] = useActionState(resolvePaymentReport, {});
  return (
    <form action={action}>
      <Msg s={s} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="subtle" disabled={pending}>
        Mark resolved
      </Button>
    </form>
  );
}

export function OpenRequestActions({ id }: { id: string }) {
  const [s, action, pending] = useActionState(setOpenRequestStatus, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Msg s={s} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" name="status" value="matched" size="sm" disabled={pending}>
        Matched
      </Button>
      <Button type="submit" name="status" value="closed" size="sm" variant="subtle" disabled={pending}>
        Close
      </Button>
    </form>
  );
}

export function JobIssueForm({ id }: { id: string }) {
  const [s, action, pending] = useActionState(updateJobIssue, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <Msg s={s} />
      <input type="hidden" name="id" value={id} />
      <Input name="resolution" placeholder="Resolution note (sent to the customer when resolved or denied)" maxLength={2000} aria-label="Resolution note" />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="status" value="mechanic_contacted" size="sm" variant="subtle" disabled={pending}>
          Mechanic contacted
        </Button>
        <Button type="submit" name="status" value="resolved" size="sm" disabled={pending}>
          Resolved
        </Button>
        <Button type="submit" name="status" value="denied" size="sm" variant="subtle" disabled={pending}>
          Deny
        </Button>
      </div>
    </form>
  );
}

export function WarrantyRefundForm({ id, maxLabel }: { id: string; maxLabel: string }) {
  const [s, action, pending] = useActionState(warrantyRefund, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <Msg s={s} />
      <input type="hidden" name="id" value={id} />
      <p className="text-xs text-muted">
        WrenchNow refunds the customer now, and the same amount comes out of this mechanic&apos;s next payout(s). The report is marked resolved and both sides are told.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">
          Refund amount (up to {maxLabel})
          <Input name="amount" type="number" min={0.01} step="0.01" required className="mt-1 w-36 py-2" />
        </label>
        <label className="min-w-48 flex-1 text-xs text-muted">
          Note to customer and mechanic
          <Input name="note" required minLength={3} maxLength={500} placeholder="Brake noise returned within the 90-day labor warranty" className="mt-1 py-2" />
        </label>
        <Button type="submit" size="sm" variant="danger" disabled={pending}>
          {pending ? "Refunding…" : "Refund & deduct"}
        </Button>
      </div>
    </form>
  );
}

export function TaxReviewedForm({ id }: { id: string }) {
  const [s, action, pending] = useActionState(markTaxReviewed, {});
  return (
    <form action={action}>
      <Msg s={s} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="subtle" disabled={pending}>
        Mark reviewed
      </Button>
    </form>
  );
}
