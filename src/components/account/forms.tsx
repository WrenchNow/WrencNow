"use client";

import { useActionState, useState } from "react";
import { addVehicle, customerTransition, fileProblemReport, updateVehicleCare, saveBusinessAccount, reportOffPlatformPayment, submitReview, updateProfile, type FormState } from "@/app/(customer)/account/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";

export function StateNotice({ state }: { state: FormState }) {
  if (state.error) return <Notice tone="danger">{state.error}</Notice>;
  if (state.message) return <Notice tone="ok">{state.message}</Notice>;
  return null;
}

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <StateNotice state={state} />
      <Field label="Email" htmlFor="email" hint="Contact support to change your email.">
        <Input id="email" value={email} disabled readOnly />
      </Field>
      <Field label="Full name" htmlFor="full_name">
        <Input id="full_name" name="full_name" defaultValue={fullName} required autoComplete="name" />
      </Field>
      <Field label="Phone" htmlFor="phone" hint="Shared with your mechanic for an active booking.">
        <Input id="phone" name="phone" type="tel" defaultValue={phone} autoComplete="tel" />
      </Field>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function VehicleForm({ onDone }: { onDone?: () => void }) {
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await addVehicle(prev, fd);
    if (res.ok) onDone?.();
    return res;
  }, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <StateNotice state={state} />
      </div>
      <Field label="Year" htmlFor="year">
        <Input id="year" name="year" type="number" inputMode="numeric" min={1950} max={new Date().getFullYear() + 1} required placeholder="2018" />
      </Field>
      <Field label="Make" htmlFor="make">
        <Input id="make" name="make" required placeholder="Toyota" autoComplete="off" />
      </Field>
      <Field label="Model" htmlFor="model">
        <Input id="model" name="model" required placeholder="Camry" autoComplete="off" />
      </Field>
      <Field label="Trim (optional)" htmlFor="trim">
        <Input id="trim" name="trim" placeholder="SE" autoComplete="off" />
      </Field>
      <Field label="Nickname (optional)" htmlFor="nickname">
        <Input id="nickname" name="nickname" placeholder="Work truck" autoComplete="off" />
      </Field>
      <div className="flex items-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Adding…" : "Add vehicle"}
        </Button>
      </div>
    </form>
  );
}

export function CustomerBookingActions({ id, canCancel, canNoShow }: { id: string; canCancel: boolean; canNoShow: boolean }) {
  const [state, action, pending] = useActionState(customerTransition, {});
  const [confirm, setConfirm] = useState<null | "cancelled" | "no_show">(null);
  if (!canCancel && !canNoShow) return <StateNotice state={state} />;
  return (
    <div className="flex flex-col gap-3">
      <StateNotice state={state} />
      {confirm ? (
        <form action={action} className="flex flex-col gap-3 rounded-[var(--radius-control)] border border-line-strong bg-raised p-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="to" value={confirm} />
          <Field label={confirm === "cancelled" ? "Why are you cancelling? (optional)" : "What happened? (optional)"} htmlFor="reason">
            <Textarea id="reason" name="reason" maxLength={500} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "Working…" : confirm === "cancelled" ? "Yes, cancel booking" : "Report no-show"}
            </Button>
            <Button variant="subtle" onClick={() => setConfirm(null)}>
              Never mind
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {canCancel && (
            <Button variant="subtle" onClick={() => setConfirm("cancelled")}>
              Cancel booking
            </Button>
          )}
          {canNoShow && (
            <Button variant="danger" onClick={() => setConfirm("no_show")}>
              Mechanic didn&apos;t show up
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(submitReview, {});
  const [rating, setRating] = useState(0);
  if (state.ok) return <StateNotice state={state} />;
  return (
    <form action={action} className="flex flex-col gap-4">
      <StateNotice state={state} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <fieldset>
        <legend className="text-sm font-medium text-cream">How did it go?</legend>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer text-3xl">
              <input type="radio" name="rating" value={n} className="sr-only" checked={rating === n} onChange={() => setRating(n)} />
              <span className={n <= rating ? "text-warn" : "text-line-strong"} aria-hidden>
                ★
              </span>
              <span className="sr-only">
                {n} star{n > 1 ? "s" : ""}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Tell other drivers about it (optional)" htmlFor="body">
        <Textarea id="body" name="body" maxLength={2000} placeholder="Showed up on time, explained everything…" />
      </Field>
      <Button type="submit" disabled={pending || rating === 0} className="self-start">
        {pending ? "Posting…" : "Post review"}
      </Button>
    </form>
  );
}

export function OffPlatformReport({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(reportOffPlatformPayment, {});
  const [open, setOpen] = useState(false);
  if (state.ok) return <StateNotice state={state} />;
  return (
    <div className="rounded-[var(--radius-control)] border border-line bg-raised p-4">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-ore hover:underline">
          Asked to pay outside WrenchNow? Report it
        </button>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <StateNotice state={state} />
          <input type="hidden" name="bookingId" value={bookingId} />
          <p className="text-sm text-ink">Don&apos;t pay. Tell us what happened and we&apos;ll look into it.</p>
          <Field label="How did they ask you to pay? (optional)" htmlFor="method">
            <Input id="method" name="method" maxLength={60} placeholder="Cash, Venmo, Zelle…" />
          </Field>
          <Field label="What happened? (optional)" htmlFor="details">
            <Textarea id="details" name="details" maxLength={2000} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "Sending…" : "Send report"}
            </Button>
            <Button variant="subtle" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function ProblemReportForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(fileProblemReport, {});
  if (state.ok) return <StateNotice state={state} />;
  return (
    <form action={action} className="flex flex-col gap-3">
      <StateNotice state={state} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <Field label="What's wrong?" htmlFor="issue_description" hint="e.g. the squeal came back after a week, or a light is back on.">
        <Textarea id="issue_description" name="description" rows={3} required minLength={10} maxLength={2000} />
      </Field>
      <Button type="submit" variant="subtle" disabled={pending} className="self-start">
        {pending ? "Sending…" : "Report a problem"}
      </Button>
    </form>
  );
}

export function VehicleCareForm({ id, mileage, reminders, label }: { id: string; mileage: number | null; reminders: boolean; label: string }) {
  const [state, action, pending] = useActionState(updateVehicleCare, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <StateNotice state={state} />
      <input type="hidden" name="id" value={id} />
      <Field label="Mileage" htmlFor={`mileage-${id}`} hint="Optional. Updated automatically when you add it at booking.">
        <Input id={`mileage-${id}`} name="mileage" inputMode="numeric" defaultValue={mileage ?? ""} maxLength={9} placeholder="e.g. 84,500" />
      </Field>
      <Checkbox
        id={`reminders-${id}`}
        name="reminders"
        defaultChecked={reminders}
        aria-label={`Maintenance reminders for ${label}`}
        label="Email me maintenance reminders for this car. We'll save your choice now and start sending when reminders launch."
      />
      <Button type="submit" size="sm" variant="subtle" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function BusinessForm({ companyName, billingEmail }: { companyName: string; billingEmail: string }) {
  const [state, action, pending] = useActionState(saveBusinessAccount, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <StateNotice state={state} />
      <Field label="Company name" htmlFor="company_name">
        <Input id="company_name" name="company_name" defaultValue={companyName} required minLength={2} maxLength={120} autoComplete="organization" />
      </Field>
      <Field label="Billing email (optional)" htmlFor="billing_email" hint="Shown on your monthly statements.">
        <Input id="billing_email" name="billing_email" type="email" defaultValue={billingEmail} maxLength={200} />
      </Field>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="font-semibold text-ore hover:underline">
      Print / save PDF
    </button>
  );
}
