"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { checkIn, saveTypicalPartsPrices, mechanicTransition, saveMechanicProfile, savePhotoUrl, saveServices, submitApplication, submitInsurance, type FormState } from "@/app/(mechanic)/mechanic/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { WARRANTY_OPTIONS, warrantyLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";

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
  warranty_days: number;
  has_tools: boolean;
  has_transport: boolean;
};

export function MechanicProfileForm({ d, minWarrantyDays = 0 }: { d: ProfileDefaults; minWarrantyDays?: number }) {
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
      <Field label="Warranty on your work" htmlFor="warranty_days" hint={`Shown on your profile and on customers' receipts. Every WrenchNow job carries at least ${minWarrantyDays} days.`}>
        <Select id="warranty_days" name="warranty_days" defaultValue={String(Math.max(d.warranty_days, minWarrantyDays))}>
          {WARRANTY_OPTIONS.filter((w) => w >= minWarrantyDays).map((w) => (
            <option key={w} value={w}>
              {warrantyLabel(w)}
            </option>
          ))}
        </Select>
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

export function JobActions({
  id,
  status,
  estimateMax,
  arrivedAt,
  noShowAt,
  noShowFeeLabel,
  laborMax,
  partsReceiptCents = 0,
  handlingBps = 0,
  partsPending = false,
}: {
  id: string;
  status: string;
  estimateMax: number;
  arrivedAt?: string | null;
  noShowAt?: number | null;
  noShowFeeLabel?: string;
  laborMax?: number;
  partsReceiptCents?: number;
  handlingBps?: number;
  partsPending?: boolean;
}) {
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
          <p className="text-sm text-ink">Declining is free. Once you accept a job, you can&apos;t cancel it in the app.</p>
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
        <div className="flex flex-col gap-2">
          <form action={action}>
            {hidden}
            <input type="hidden" name="to" value="en_route" />
            <Button type="submit" disabled={pending}>
              I&apos;m on my way
            </Button>
          </form>
          <p className="text-xs text-muted">
            You&apos;ve committed to this job. Emergency? Email{" "}
            <a href={CONTACT_MAILTO} className="text-ore hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      )}
      {status === "en_route" && !arrivedAt && <CheckInButton id={id} />}
      {status === "en_route" && arrivedAt && noShowAt && (
        <CustomerNoShow id={id} noShowAt={noShowAt} feeLabel={noShowFeeLabel ?? ""} action={action} pending={pending} />
      )}
      {status === "en_route" && (
        <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          {hidden}
          <input type="hidden" name="to" value="in_progress" />
          <Field label="Customer's 4-digit arrival code" htmlFor={`code-${id}`} hint="Ask the customer for the code in their app. It proves you're there.">
            <Input id={`code-${id}`} name="arrival_code" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="one-time-code" required className="w-32 text-center text-lg tracking-[0.4em]" />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Checking…" : "Verify & start job"}
          </Button>
        </form>
      )}
      {status === "in_progress" && (
        <CompleteJobForm
          hidden={hidden}
          action={action}
          pending={pending}
          estimateMax={estimateMax}
          laborMax={laborMax ?? estimateMax}
          partsReceiptCents={partsReceiptCents}
          handlingBps={handlingBps}
          partsPending={partsPending}
          id={id}
        />
      )}
    </div>
  );
}

export function InsuranceForm({ userId, defaults }: { userId: string; defaults: { provider: string; policy: string } }) {
  const [state, setState] = useState<FormState>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("certificate");
    if (!(file instanceof File) || file.size === 0) return setState({ error: "Upload your certificate of insurance." });
    if (file.size > 10 * 1024 * 1024) return setState({ error: "File must be under 10 MB." });
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) return setState({ error: "Use a PDF, JPG, PNG, or WebP file." });
    setBusy(true);
    setState({});
    const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
    const path = `${userId}/insurance-${Date.now()}.${ext}`;
    const { error } = await createClient().storage.from("mechanic-docs").upload(path, file, { contentType: file.type });
    if (error) {
      setBusy(false);
      return setState({ error: "Upload failed. Please try again." });
    }
    setState(
      await submitInsurance({
        provider: String(fd.get("provider") ?? ""),
        policy_number: String(fd.get("policy_number") ?? ""),
        expires_on: String(fd.get("expires_on") ?? ""),
        doc_path: path,
      }),
    );
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <StateNotice state={state} />
      </div>
      <Field label="Insurance company" htmlFor="provider">
        <Input id="provider" name="provider" defaultValue={defaults.provider} required maxLength={120} />
      </Field>
      <Field label="Policy number" htmlFor="policy_number">
        <Input id="policy_number" name="policy_number" defaultValue={defaults.policy} required maxLength={80} />
      </Field>
      <Field label="Policy expiration date" htmlFor="expires_on">
        <Input id="expires_on" name="expires_on" type="date" required />
      </Field>
      <Field label="Certificate of insurance" htmlFor="certificate" hint="PDF or photo, under 10 MB. Only WrenchNow staff can see it.">
        <Input id="certificate" name="certificate" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required className="py-2" />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Uploading…" : "Submit insurance"}
        </Button>
      </div>
    </form>
  );
}

function CheckInButton({ id }: { id: string }) {
  const [state, setState] = useState<FormState>({});
  const [busy, setBusy] = useState(false);
  function go() {
    if (!("geolocation" in navigator)) return setState({ error: "Your browser can't share location. Turn on location to check in." });
    setBusy(true);
    setState({});
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setState(await checkIn(id, pos.coords.latitude, pos.coords.longitude));
        setBusy(false);
      },
      () => {
        setState({ error: "Location is off. Allow location for this site to check in at the address." });
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <StateNotice state={state} />
      <Button variant="subtle" onClick={go} disabled={busy}>
        {busy ? "Checking your location…" : "📍 I'm here"}
      </Button>
      <p className="text-xs text-muted">Check in when you reach the address. The customer is told you&apos;ve arrived.</p>
    </div>
  );
}

function CustomerNoShow({
  id,
  noShowAt,
  feeLabel,
  action,
  pending,
}: {
  id: string;
  noShowAt: number;
  feeLabel: string;
  action: (fd: FormData) => void;
  pending: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  const minsLeft = Math.ceil((noShowAt - now) / 60_000);
  if (minsLeft > 0) {
    return <p className="text-sm text-muted">Checked in. Call or text the customer. If they don&apos;t respond, you can mark a no-show in {minsLeft} min.</p>;
  }
  return confirm ? (
    <form action={action} className="flex flex-col gap-2 rounded-[var(--radius-control)] border border-warn/30 bg-warn-dim p-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="to" value="customer_no_show" />
      <p className="text-sm text-ink">
        The customer will be charged a {feeLabel} no-show fee and you&apos;ll get your share. Only do this if you&apos;re at the address and tried to reach them.
      </p>
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={pending}>
          Customer didn&apos;t show — charge {feeLabel}
        </Button>
        <Button variant="subtle" onClick={() => setConfirm(false)}>
          Keep waiting
        </Button>
      </div>
    </form>
  ) : (
    <Button variant="subtle" onClick={() => setConfirm(true)}>
      Customer isn&apos;t here
    </Button>
  );
}

function CompleteJobForm({
  id,
  hidden,
  action,
  pending,
  estimateMax,
  laborMax,
  partsReceiptCents,
  handlingBps,
  partsPending,
}: {
  id: string;
  hidden: React.ReactNode;
  action: (fd: FormData) => void;
  pending: boolean;
  estimateMax: number;
  laborMax: number;
  partsReceiptCents: number;
  handlingBps: number;
  partsPending: boolean;
}) {
  const [labor, setLabor] = useState("");
  const laborCents = Math.round(Number(labor || 0) * 100);
  const handling = Math.round((partsReceiptCents * handlingBps) / 10000);
  const total = laborCents + partsReceiptCents + handling;
  const over = laborCents > laborMax || total > estimateMax;
  const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
  return (
    <form action={action} className="flex flex-col gap-3">
      {hidden}
      <input type="hidden" name="to" value="completed" />
      {partsPending && <p className="text-sm text-warn">Finish the parts first: upload each receipt, or tap “Didn&apos;t need it”.</p>}
      <div className="sm:max-w-xs">
        <Field label={`Labor ($, up to ${usd(laborMax)})`} htmlFor={`labor-${id}`}>
          <Input id={`labor-${id}`} name="labor" type="number" min={0} step="0.01" inputMode="decimal" value={labor} onChange={(e) => setLabor(e.target.value)} />
        </Field>
      </div>
      <dl className="grid max-w-sm grid-cols-2 gap-1 text-sm">
        <dt className="text-muted">Labor</dt>
        <dd className="text-right text-cream">{usd(laborCents)}</dd>
        <dt className="text-muted">Parts (receipts)</dt>
        <dd className="text-right text-cream">{usd(partsReceiptCents)}</dd>
        <dt className="text-muted">Parts handling</dt>
        <dd className="text-right text-cream">{usd(handling)}</dd>
        <dt className="font-semibold text-cream">Customer pays</dt>
        <dd className={`text-right font-semibold ${over ? "text-danger" : "text-cream"}`}>{usd(total)}</dd>
      </dl>
      {over && <p className="text-sm text-danger">That&apos;s over what the customer approved.</p>}
      <Button type="submit" disabled={pending || total <= 0 || over || partsPending} className="self-start">
        {pending ? "Charging…" : "Complete & charge"}
      </Button>
    </form>
  );
}

export function TypicalPartsForm({ services }: { services: { id: number; name: string; icon: string; typical_parts_cents: number | null }[] }) {
  const [state, action, pending] = useActionState(saveTypicalPartsPrices, {});
  if (services.length === 0) return <p className="text-sm text-muted">Pick your services first.</p>;
  return (
    <form action={action} className="flex flex-col gap-3">
      <StateNotice state={state} />
      <p className="text-sm text-ink">
        What parts usually cost you for each job. Customers see it as a rough parts estimate when they book. You still send an itemized quote and receipts for each job,
        and once there are enough real receipts, WrenchNow&apos;s data replaces these numbers.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {services.map((s) => (
          <label key={s.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-line-strong bg-raised px-3 py-2 text-sm">
            <span className="text-cream">
              <span aria-hidden className="mr-1.5">
                {s.icon}
              </span>
              {s.name}
            </span>
            <span className="flex items-center gap-1 text-muted">
              $
              <Input
                name={`parts_${s.id}`}
                type="number"
                min={0}
                step="1"
                aria-label={`Typical parts cost for ${s.name}`}
                defaultValue={s.typical_parts_cents !== null ? String(s.typical_parts_cents / 100) : ""}
                className="w-24 py-1.5"
              />
            </span>
          </label>
        ))}
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save parts prices"}
      </Button>
    </form>
  );
}
