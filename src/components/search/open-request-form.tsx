"use client";

import { useActionState } from "react";
import { createOpenRequest, type RequestState } from "@/app/(customer)/search/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/form";

export function OpenRequestForm({ location, service, defaults }: { location: string; service: string | null; defaults: { name: string; email: string; phone: string } }) {
  const [state, action, pending] = useActionState<RequestState, FormData>(createOpenRequest, {});
  if (state.ok) {
    return (
      <Notice tone="ok" title="Request sent">
        We&apos;ll match you with a mechanic as soon as we can and email you. No charge until you book.
      </Notice>
    );
  }
  return (
    <form action={action} className="grid gap-4 text-left sm:grid-cols-2">
      {state.error && (
        <div className="sm:col-span-2">
          <Notice tone="danger">{state.error}</Notice>
        </div>
      )}
      <input type="hidden" name="location_text" value={location} />
      <input type="hidden" name="service_slug" value={service ?? ""} />
      <div className="hidden" aria-hidden>
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <Field label="Your name" htmlFor="req-name">
        <Input id="req-name" name="name" required defaultValue={defaults.name} autoComplete="name" />
      </Field>
      <Field label="Email" htmlFor="req-email">
        <Input id="req-email" name="email" type="email" required defaultValue={defaults.email} autoComplete="email" />
      </Field>
      <Field label="Phone (optional)" htmlFor="req-phone">
        <Input id="req-phone" name="phone" type="tel" defaultValue={defaults.phone} autoComplete="tel" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="What does the car need? (optional)" htmlFor="req-details">
          <Textarea id="req-details" name="details" maxLength={2000} placeholder="2014 Honda Civic, brakes grinding…" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send my request"}
        </Button>
      </div>
    </form>
  );
}
