"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createBookingAction, estimateAction } from "@/app/(customer)/account/actions";
import { VehicleForm } from "@/components/account/forms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { estimateMaxCents, estimateMinCents } from "@/lib/fees";
import { money } from "@/lib/format";
import { buildSlots, type Busy } from "@/lib/slots";
import { PaymentStep } from "./payment-step";

type ServiceOpt = { slug: string; name: string; icon: string; min: number; max: number; needsLift?: boolean };
type CarLocation = "driveway" | "street" | "garage" | "parking_lot";
const CAR_LOCATIONS: { value: CarLocation; label: string }[] = [
  { value: "driveway", label: "Driveway" },
  { value: "street", label: "Street" },
  { value: "garage", label: "Garage" },
  { value: "parking_lot", label: "Parking lot" },
];
type VehicleOpt = { id: string; label: string; nickname: string | null };
type Urgency = "flexible" | "soon" | "today" | "stranded";

const URGENCY: { value: Urgency; label: string }[] = [
  { value: "flexible", label: "Flexible — any time this week" },
  { value: "soon", label: "Soon — within 2–3 days" },
  { value: "today", label: "Today if possible" },
  { value: "stranded", label: "I'm stranded right now" },
];

const STEPS = ["Service", "Car & place", "Time", "Confirm"];

export function BookingWizard({
  mechanic,
  services,
  vehicles,
  busy,
  initialService,
  publishableKey,
  initialPhone,
  noShowFeeLabel,
  businessName,
}: {
  mechanic: { id: string; name: string; rateCents: number };
  services: ServiceOpt[];
  vehicles: VehicleOpt[];
  busy: Busy[];
  initialService: string;
  publishableKey: string | null;
  initialPhone: string;
  noShowFeeLabel: string;
  businessName: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serviceSlug, setServiceSlug] = useState(services.some((s) => s.slug === initialService) ? initialService : "");
  const [problem, setProblem] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("flexible");
  const [vehicleId, setVehicleId] = useState(vehicles.length === 1 ? vehicles[0]!.id : "");
  const [addingVehicle, setAddingVehicle] = useState(vehicles.length === 0);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [odometer, setOdometer] = useState("");
  const [carLocation, setCarLocation] = useState<CarLocation | "">("");
  const [carCovered, setCarCovered] = useState(false);
  const [billToBusiness, setBillToBusiness] = useState(Boolean(businessName));
  const [start, setStart] = useState("");
  const [dayIdx, setDayIdx] = useState(0);
  const [terms, setTerms] = useState(false);
  const [estimateApproved, setEstimateApproved] = useState(false);
  const [returnOldParts, setReturnOldParts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ bookingId: string; clientSecret: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const service = services.find((s) => s.slug === serviceSlug);
  const days = useMemo(() => (service ? buildSlots(new Date(), service.max, busy) : []), [service, busy]);
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const slotLabel = start ? new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(start)) : "";
  const laborMinLocal = service && mechanic.rateCents ? estimateMinCents(mechanic.rateCents, service.min) : 0;
  const laborMaxLocal = service && mechanic.rateCents ? estimateMaxCents(mechanic.rateCents, service.max) : 0;
  // Exact numbers (incl. the parts estimate for this car) come from the server at the review step.
  const [quote, setQuote] = useState<{ laborMin: number; laborMax: number; partsCharge: number; basis: string; total: number } | null>(null);
  useEffect(() => {
    if (step !== 3 || !serviceSlug || !vehicleId) return;
    let live = true;
    estimateAction(mechanic.id, serviceSlug, vehicleId).then((q) => live && setQuote(q));
    return () => {
      live = false;
    };
  }, [step, serviceSlug, vehicleId, mechanic.id]);
  const estMin = (quote?.laborMin ?? laborMinLocal) + (quote?.partsCharge ?? 0);
  const estMax = quote?.total ?? laborMaxLocal;

  if (services.length === 0) {
    return <Notice tone="warn" title="No services listed">This mechanic hasn&apos;t listed any services yet. Try another mechanic.</Notice>;
  }

  function next() {
    setError(null);
    if (step === 0 && !service) return setError("Pick a service to continue.");
    if (step === 1 && !vehicleId) return setError("Pick or add the vehicle.");
    if (step === 1 && address.trim().length < 5) return setError("Enter the address where the car will be.");
    if (step === 1 && !carLocation) return setError("Tell us where the car is parked.");
    if (step === 1 && phone.replace(/\D/g, "").length < 7) return setError("Enter a phone number your mechanic can reach you at.");
    if (step === 2 && !start) return setError("Pick a time.");
    setStep((s) => s + 1);
  }

  function submit() {
    setError(null);
    if (!estimateApproved) return setError("Please approve the estimate.");
    if (!terms) return setError("Please accept the service terms.");
    startTransition(async () => {
      const res = await createBookingAction({
        mechanicId: mechanic.id,
        serviceSlug,
        vehicleId,
        address,
        phone,
        problem,
        urgency,
        start,
        terms: true,
        estimateApproved: true,
        returnOldParts,
        carLocation: carLocation as CarLocation, // required at step 1; the server validates it too
        carCovered: carCovered || carLocation === "garage",
        billToBusiness: Boolean(businessName) && billToBusiness,
        odometer: odometer.trim() ? Number(odometer.replace(/[,\s]/g, "")) : null,
      });
      if (res.error || !res.clientSecret || !res.bookingId) {
        setError(res.error ?? "Something went wrong. Please try again.");
        return;
      }
      setPayment({ bookingId: res.bookingId, clientSecret: res.clientSecret });
    });
  }

  return (
    <div>
      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Booking steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-col gap-1.5" aria-current={i === step ? "step" : undefined}>
            <span className={`h-1.5 rounded-full ${i <= step ? "bg-ore" : "bg-line-strong"}`} />
            <span className={`text-xs ${i === step ? "text-cream" : "text-muted"}`}>{label}</span>
          </li>
        ))}
      </ol>

      <Card>
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <fieldset>
              <legend className="text-lg font-bold text-cream">What does your car need?</legend>
              <div className="mt-3 grid gap-2">
                {services.map((s) => (
                  <label key={s.slug} className="cursor-pointer">
                    <input type="radio" name="service" value={s.slug} checked={serviceSlug === s.slug} onChange={() => { setServiceSlug(s.slug); setStart(""); }} className="peer sr-only" />
                    <span className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-line-strong bg-raised px-4 py-3 transition peer-checked:border-ore peer-checked:bg-ore-dim peer-focus-visible:outline-2 peer-focus-visible:outline-ore-bright">
                      <span className="text-cream">
                        <span aria-hidden className="mr-2">
                          {s.icon}
                        </span>
                        {s.name}
                      </span>
                      <span className="text-sm text-muted">
                        {money(estimateMinCents(mechanic.rateCents, s.min), { whole: true })}–{money(estimateMaxCents(mechanic.rateCents, s.max), { whole: true })}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {service?.needsLift && (
                <p className="mt-3 rounded-[var(--radius-control)] border border-warn/30 bg-warn-dim px-3 py-2 text-sm text-warn">
                  This job sometimes needs a lift. Your mechanic will confirm it can be done where your car is before starting.
                </p>
              )}
            </fieldset>
            <Field label="Describe the problem (optional — plain English is fine)" htmlFor="problem">
              <Textarea id="problem" value={problem} onChange={(e) => setProblem(e.target.value)} maxLength={2000} placeholder="Squeals when I brake, started last week…" />
            </Field>
            <fieldset>
              <legend className="text-sm font-medium text-cream">How urgent is it?</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {URGENCY.map((u) => (
                  <label key={u.value} className="cursor-pointer">
                    <input type="radio" name="urgency" value={u.value} checked={urgency === u.value} onChange={() => setUrgency(u.value)} className="peer sr-only" />
                    <span className="block rounded-[var(--radius-control)] border border-line-strong bg-raised px-3 py-2.5 text-sm text-ink transition peer-checked:border-ore peer-checked:bg-ore-dim peer-checked:text-cream peer-focus-visible:outline-2 peer-focus-visible:outline-ore-bright">
                      {u.label}
                    </span>
                  </label>
                ))}
              </div>
              {urgency === "stranded" && (
                <p className="mt-2 text-sm text-warn">If you&apos;re somewhere unsafe, call 911 or roadside assistance first. Pick the earliest slot below and your mechanic will see it&apos;s urgent.</p>
              )}
            </fieldset>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-5">
            <fieldset>
              <legend className="text-lg font-bold text-cream">Which car?</legend>
              {vehicles.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {vehicles.map((v) => (
                    <label key={v.id} className="cursor-pointer">
                      <input type="radio" name="vehicle" value={v.id} checked={vehicleId === v.id} onChange={() => setVehicleId(v.id)} className="peer sr-only" />
                      <span className="block rounded-[var(--radius-control)] border border-line-strong bg-raised px-4 py-3 text-cream transition peer-checked:border-ore peer-checked:bg-ore-dim peer-focus-visible:outline-2 peer-focus-visible:outline-ore-bright">
                        {v.label}
                        {v.nickname && <span className="ml-2 text-sm text-muted">{v.nickname}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {addingVehicle ? (
                <div className="mt-4 rounded-[var(--radius-control)] border border-line p-4">
                  <VehicleForm
                    onDone={() => {
                      setAddingVehicle(false);
                      router.refresh();
                    }}
                  />
                </div>
              ) : (
                <button type="button" onClick={() => setAddingVehicle(true)} className="mt-3 text-sm font-semibold text-ore hover:underline">
                  + Add another vehicle
                </button>
              )}
            </fieldset>
            <Field label="Current mileage (optional)" htmlFor="odometer" hint="Helps your mechanic and keeps your service history complete.">
              <Input id="odometer" inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} maxLength={9} placeholder="e.g. 84,500" />
            </Field>
            <Field label="Where will the car be?" htmlFor="address" hint="Street address, plus any notes like “level 2 of the garage”.">
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" maxLength={300} placeholder="1234 Main St, Denver, CO 80205" />
            </Field>
            <fieldset>
              <legend className="text-sm font-semibold text-cream">Where is the car parked?</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CAR_LOCATIONS.map((l) => (
                  <label key={l.value} className="cursor-pointer">
                    <input type="radio" name="car_location" value={l.value} checked={carLocation === l.value} onChange={() => setCarLocation(l.value)} className="peer sr-only" />
                    <span className="block rounded-[var(--radius-control)] border border-line-strong bg-raised px-3 py-2 text-center text-sm text-cream transition peer-checked:border-ore peer-checked:bg-ore-dim peer-focus-visible:outline-2 peer-focus-visible:outline-ore-bright">
                      {l.label}
                    </span>
                  </label>
                ))}
              </div>
              {carLocation && carLocation !== "garage" && (
                <div className="mt-3">
                  <Checkbox id="car_covered" checked={carCovered} onChange={(e) => setCarCovered(e.target.checked)} label="It's under cover (carport, parking garage)" />
                </div>
              )}
              {carLocation && carLocation !== "garage" && !carCovered && (
                <p className="mt-2 text-xs text-muted">
                  Mobile mechanics work outdoors. In snow, heavy rain or extreme cold, your mechanic may contact you to move the appointment. A covered spot helps.
                </p>
              )}
              {carLocation === "street" && <p className="mt-1 text-xs text-muted">Check that street parking allows repairs where you are, and leave room to work around the car.</p>}
            </fieldset>
            {businessName && (
              <Checkbox id="bill_to_business" checked={billToBusiness} onChange={(e) => setBillToBusiness(e.target.checked)} label={`This job is for ${businessName} (shows on your monthly business statement)`} />
            )}
            <Field label="Your phone number" htmlFor="phone" hint="Your mechanic calls or texts this when they arrive.">
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={32} placeholder="(303) 555-0100" />
            </Field>
          </div>
        )}

        {step === 2 && service && (
          <div>
            <h2 className="text-lg font-bold text-cream">When works for you?</h2>
            <p className="mt-1 text-sm text-muted">Times are Mountain Time. This job usually takes up to {service.max >= 60 ? `${+(service.max / 60).toFixed(1)} hours` : `${service.max} minutes`}.</p>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Day">
              {days.map((d, i) => (
                <button
                  key={d.date}
                  type="button"
                  role="tab"
                  aria-selected={i === dayIdx}
                  onClick={() => setDayIdx(i)}
                  className={`shrink-0 rounded-[var(--radius-control)] border px-3 py-2 text-sm font-semibold ${i === dayIdx ? "border-ore bg-ore-dim text-cream" : "border-line-strong bg-raised text-ink"}`}
                >
                  {i === 0 ? "Today" : d.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4" role="tabpanel">
              {days[dayIdx]?.slots.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  disabled={!s.available}
                  onClick={() => setStart(s.start)}
                  aria-pressed={start === s.start}
                  className={`rounded-[var(--radius-control)] border px-2 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                    start === s.start ? "border-ore bg-ore text-on-ore" : "border-line-strong bg-raised text-cream hover:border-ore"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {days[dayIdx] && days[dayIdx].slots.every((s) => !s.available) && <p className="mt-3 text-sm text-muted">No open times this day — try another day.</p>}
          </div>
        )}

        {step === 3 && service && (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg font-bold text-cream">Review your booking</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Summary label="Mechanic" value={mechanic.name} />
              <Summary label="Service" value={service.name} />
              <Summary label="Vehicle" value={vehicle?.label ?? ""} />
              <Summary label="Where" value={address} />
              <Summary label="When" value={slotLabel} />
              <Summary label="Estimate" value={`${money(estMin, { whole: true })}–${money(estMax, { whole: true })}`} />
              <Summary label="Labor" value={`${money(quote?.laborMin ?? laborMinLocal, { whole: true })}–${money(quote?.laborMax ?? laborMaxLocal, { whole: true })}`} />
              <Summary
                label="Parts"
                value={
                  quote && quote.partsCharge > 0
                    ? `about ${money(quote.partsCharge, { whole: true })} (${quote.basis === "mechanic" ? "mechanic's usual price" : `based on ${quote.basis}`})`
                    : "Quoted in the app before purchase"
                }
              />
            </dl>
            <div className="rounded-[var(--radius-control)] border border-line bg-raised p-4 text-sm text-ink">
              <p className="font-semibold text-cream">How payment works</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>We place a hold of {money(estMax)} on your card now. You aren&apos;t charged yet.</li>
                <li>When the job is done, you&apos;re charged the final amount — never more than {money(estMax)}. The rest of the hold is released.</li>
                <li>Parts are billed at the receipt price plus a small handling charge. Before buying, your mechanic sends an itemized parts list for you to approve in the app, and you&apos;ll see every receipt.</li>
                <li>Cancel free any time before your mechanic heads out and the full hold is released.</li>
                <li>
                  Something wrong afterwards? Report it from your booking and we&apos;ll help sort it out —{" "}
                  <Link href="/booking-protection" target="_blank" className="text-ore hover:underline">
                    booking protection
                  </Link>
                  .
                </li>
                <li>
                  If your mechanic checks in at the address and you don&apos;t respond within 15 minutes, a {noShowFeeLabel} no-show fee is charged instead of the job.
                </li>
                <li>
                  All payments go through WrenchNow. Never pay your mechanic directly —{" "}
                  <Link href="/payment-protection" target="_blank" className="text-ore hover:underline">
                    here&apos;s why
                  </Link>
                  .
                </li>
              </ul>
            </div>
            {payment && publishableKey ? (
              <PaymentStep publishableKey={publishableKey} clientSecret={payment.clientSecret} bookingId={payment.bookingId} amountLabel={money(estMax)} />
            ) : (
              <>
                <Checkbox
                  id="estimate-approved"
                  checked={estimateApproved}
                  onChange={(e) => setEstimateApproved(e.target.checked)}
                  label={
                    <>
                      <strong className="text-cream">I approve this estimate</strong> of {money(estMin, { whole: true })}–{money(estMax, { whole: true })} for {service.name}. I
                      won&apos;t be charged more than {money(estMax)} without approving a new estimate.
                    </>
                  }
                />
                <Checkbox
                  id="old-parts"
                  checked={returnOldParts}
                  onChange={(e) => setReturnOldParts(e.target.checked)}
                  label="Give me my old parts back (the mechanic will leave the replaced parts with you)"
                />
                <Checkbox
                  id="terms"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  label={
                    <>
                      I agree to the{" "}
                      <Link href="/terms" target="_blank" className="text-ore hover:underline">
                        Terms of Service
                      </Link>
                      . I understand my mechanic is an independent contractor, not a WrenchNow employee, and that I&apos;ll make sure the car is accessible at the booked time.
                    </>
                  }
                />
                {!publishableKey && <Notice tone="warn" title="Payments aren't connected yet">Bookings open as soon as card payments are switched on.</Notice>}
              </>
            )}
          </div>
        )}

        {error && (
          <div className="mt-5">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}

        {!payment && (
          <div className="mt-6 flex gap-2">
            {step > 0 && (
              <Button variant="subtle" onClick={() => { setError(null); setStep((s) => s - 1); }}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={next} className="flex-1">
                Next: {STEPS[step + 1]}
              </Button>
            ) : (
              <Button onClick={submit} disabled={pending || !publishableKey || !quote} className="flex-1">
                {pending ? "Setting up…" : "Continue to payment"}
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-line bg-raised px-3 py-2.5">
      <dt className="text-xs tracking-wider text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-cream">{value}</dd>
    </div>
  );
}
