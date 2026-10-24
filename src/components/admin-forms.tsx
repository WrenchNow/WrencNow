"use client";

import { useActionState } from "react";
import { adminCancelBooking, refundBooking, resolvePaymentReport, reviewInsurance, updateWarrantyClaim, setOpenRequestStatus, reviewMechanic, waiveOnboardingFee, type FormState } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";

function Msg({ s }: { s: FormState }) {
  if (s.error) return <Notice tone="danger">{s.error}</Notice>;
  if (s.message) return <Notice tone="ok">{s.message}</Notice>;
  return null;
}

export function ReviewMechanicForm({ id, status, tier }: { id: string; status: string; tier: string }) {
  const [s, action, pending] = useActionState(reviewMechanic, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <Msg s={s} />
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">
          Status
          <Select name="status" defaultValue={status} className="mt-1 py-2">
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

export function WarrantyClaimForm({ id }: { id: string }) {
  const [s, action, pending] = useActionState(updateWarrantyClaim, {});
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
