"use client";

import { useActionState } from "react";
import { adminCancelBooking, refundBooking, reviewMechanic, type FormState } from "@/app/(admin)/admin/actions";
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
