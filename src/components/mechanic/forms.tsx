"use client";

import { useActionState, useRef, useState } from "react";
import { mechanicTransition, saveMechanicProfile, savePhotoUrl, saveServices, submitApplication, type FormState } from "@/app/(mechanic)/mechanic/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";

function StateNotice({ state }: { state: FormState }) {
  if (state.error) return <Notice tone="danger">{state.error}</Notice>;
  if (state.message) return <Notice tone="ok">{state.message}</Notice>;
  return null;
}

export type ProfileDefaults = {
  display_name: string;
  phone: string;
  bio: string;
  years_experience: number | null;
  certifications: string[];
  specialties: string[];
  hourly_rate: number | null;
  base_location: string;
  service_radius_miles: number;
  has_tools: boolean;
  has_transport: boolean;
};

export function MechanicProfileForm({ d }: { d: ProfileDefaults }) {
  const [state, action, pending] = useActionState(saveMechanicProfile, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <StateNotice state={state} />
      </div>
      <Field label="Name customers see" htmlFor="display_name">
        <Input id="display_name" name="display_name" defaultValue={d.display_name} required maxLength={80} />
      </Field>
      <Field label="Phone" htmlFor="phone" hint="Shared with customers only for active jobs.">
        <Input id="phone" name="phone" type="tel" defaultValue={d.phone} required autoComplete="tel" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="About you" htmlFor="bio" hint="Your experience, what you're best at, and how you work.">
          <Textarea id="bio" name="bio" defaultValue={d.bio} required minLength={20} maxLength={2000} rows={5} />
        </Field>
      </div>
      <Field label="Years of professional experience" htmlFor="years_experience">
        <Input id="years_experience" name="years_experience" type="number" min={0} max={60} defaultValue={d.years_experience ?? ""} required />
      </Field>
      <Field label="Hourly rate (USD)" htmlFor="hourly_rate" hint="What customers pay per hour of work.">
        <Input id="hourly_rate" name="hourly_rate" type="number" min={20} max={500} step="1" defaultValue={d.hourly_rate ?? ""} required />
      </Field>
      <Field label="Certifications (comma separated)" htmlFor="certifications" hint="e.g. ASE A5 Brakes, Toyota factory trained">
        <Input id="certifications" name="certifications" defaultValue={d.certifications.join(", ")} />
      </Field>
      <Field label="Specialties (comma separated)" htmlFor="specialties" hint="e.g. Subaru, diesel, European">
        <Input id="specialties" name="specialties" defaultValue={d.specialties.join(", ")} />
      </Field>
      <Field label="Base location (ZIP or address)" htmlFor="base_location" hint="Used to match you with nearby customers. Never shown publicly.">
        <Input id="base_location" name="base_location" defaultValue={d.base_location} required />
      </Field>
      <Field label="How far will you travel? (miles)" htmlFor="service_radius_miles">
        <Input id="service_radius_miles" name="service_radius_miles" type="number" min={1} max={100} defaultValue={d.service_radius_miles} required />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <Checkbox id="has_tools" name="has_tools" defaultChecked={d.has_tools} label="I have my own professional tools for mobile repairs" />
        <Checkbox id="has_transport" name="has_transport" defaultChecked={d.has_transport} label="I have reliable transportation to reach customers" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

export function ServicesForm({ services, selected, tierRank }: { services: { id: number; name: string; icon: string; tier: string; rank: number }[]; selected: number[]; tierRank: number }) {
  const [state, action, pending] = useActionState(saveServices, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <StateNotice state={state} />
      <div className="grid gap-2 sm:grid-cols-2">
        {services.map((s) => {
          const locked = s.rank > tierRank;
          return (
            <label key={s.id} className={`flex items-center gap-3 rounded-[var(--radius-control)] border border-line-strong bg-raised px-3 py-2.5 text-sm ${locked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
              <input type="checkbox" name="service" value={s.id} defaultChecked={selected.includes(s.id)} disabled={locked} className="h-4 w-4 accent-[var(--color-ore)]" />
              <span className="text-cream">
                <span aria-hidden className="mr-1.5">
                  {s.icon}
                </span>
                {s.name}
              </span>
              {locked && <span className="ml-auto text-xs text-muted">{s.tier} tier</span>}
            </label>
          );
        })}
      </div>
      <p className="text-xs text-muted">Greyed-out services unlock if WrenchNow moves you to a higher tier after reviewing your experience.</p>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save services"}
      </Button>
    </form>
  );
}

export function SubmitApplicationForm({ submitted }: { submitted: boolean }) {
  const [state, action, pending] = useActionState(submitApplication, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <StateNotice state={state} />
      <Checkbox
        id="agree"
        name="agree"
        defaultChecked={submitted}
        label={
          <>
            I&apos;ve read and agree to the{" "}
            <a href="/mechanic-agreement" target="_blank" className="text-ore hover:underline">
              Mechanic Agreement
            </a>
            . I&apos;m an independent contractor and I&apos;ll carry my own liability insurance.
          </>
        }
      />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Submitting…" : submitted ? "Re-submit application" : "Submit application"}
      </Button>
    </form>
  );
}

export function PhotoUpload({ userId, current }: { userId: string; current: string | null }) {
  const [state, setState] = useState<FormState>({});
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setState({ error: "Photo must be under 5 MB." });
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setState({ error: "Use a JPG, PNG, or WebP image." });
    setBusy(true);
    setState({});
    const supabase = createClient();
    const path = `${userId}/avatar-${Date.now()}.${file.type.split("/")[1]}`;
    const { error } = await supabase.storage.from("mechanic-photos").upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setBusy(false);
      return setState({ error: "Upload failed. Please try again." });
    }
    const { data } = supabase.storage.from("mechanic-photos").getPublicUrl(path);
    setState(await savePhotoUrl(data.publicUrl));
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <StateNotice state={state} />
      <div className="flex items-center gap-4">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="Your profile photo" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-raised text-2xl" aria-hidden>
            📷
          </span>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} className="sr-only" id="photo" />
        <Button variant="subtle" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : current ? "Change photo" : "Upload photo"}
        </Button>
      </div>
      <p className="text-xs text-muted">A clear, friendly headshot. Customers book faces they can recognize at the door.</p>
    </div>
  );
}

export function JobActions({ id, status, estimateLabel, estimateMax }: { id: string; status: string; estimateLabel: string; estimateMax: number }) {
  const [state, action, pending] = useActionState(mechanicTransition, {});
  const [confirmDecline, setConfirmDecline] = useState(false);
  if (state.ok) return <StateNotice state={state} />;

  const hidden = <input type="hidden" name="id" value={id} />;
  return (
    <div className="flex flex-col gap-3">
      <StateNotice state={state} />
      {status === "requested" && !confirmDecline && (
        <div className="flex flex-wrap gap-2">
          <form action={action}>
            {hidden}
            <input type="hidden" name="to" value="accepted" />
            <Button type="submit" disabled={pending}>
              Accept job
            </Button>
          </form>
          <Button variant="subtle" onClick={() => setConfirmDecline(true)}>
            Decline
          </Button>
        </div>
      )}
      {confirmDecline && (
        <form action={action} className="flex flex-col gap-2">
          {hidden}
          <input type="hidden" name="to" value="cancelled" />
          <Field label="Reason (shared with the customer)" htmlFor={`reason-${id}`}>
            <Input id={`reason-${id}`} name="reason" maxLength={300} placeholder="Not available at that time" />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="danger" disabled={pending}>
              Decline job
            </Button>
            <Button variant="subtle" onClick={() => setConfirmDecline(false)}>
              Back
            </Button>
          </div>
        </form>
      )}
      {status === "accepted" && (
        <div className="flex flex-wrap gap-2">
          <form action={action}>
            {hidden}
            <input type="hidden" name="to" value="en_route" />
            <Button type="submit" disabled={pending}>
              I&apos;m on my way
            </Button>
          </form>
          <form action={action}>
            {hidden}
            <input type="hidden" name="to" value="cancelled" />
            <Button type="submit" variant="subtle" disabled={pending}>
              Cancel job
            </Button>
          </form>
        </div>
      )}
      {status === "en_route" && (
        <form action={action}>
          {hidden}
          <input type="hidden" name="to" value="in_progress" />
          <Button type="submit" disabled={pending}>
            Start job
          </Button>
        </form>
      )}
      {status === "in_progress" && (
        <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          {hidden}
          <input type="hidden" name="to" value="completed" />
          <Field label={`Final amount (max ${estimateLabel})`} htmlFor={`final-${id}`}>
            <Input id={`final-${id}`} name="final_amount" type="number" min={1} max={estimateMax / 100} step="0.01" required inputMode="decimal" />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Charging…" : "Complete & charge"}
          </Button>
        </form>
      )}
    </div>
  );
}
