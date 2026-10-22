"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(key: string) {
  stripePromise ??= loadStripe(key);
  return stripePromise;
}

function PayForm({ bookingId, amountLabel }: { bookingId: string; amountLabel: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPending(true);
    setError(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/account/bookings/${bookingId}?paid=1` },
    });
    // Only reached on an immediate error; success redirects to return_url.
    setError(error?.message ?? "Payment didn't go through. Please try again.");
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <Notice tone="danger">{error}</Notice>}
      <Button type="submit" size="lg" disabled={!stripe || pending}>
        {pending ? "Placing hold…" : `Place ${amountLabel} hold & book`}
      </Button>
      <p className="text-center text-xs text-muted">This is a hold, not a charge. You&apos;re charged the final amount only when the job is done.</p>
    </form>
  );
}

export function PaymentStep({ publishableKey, clientSecret, bookingId, amountLabel }: { publishableKey: string; clientSecret: string; bookingId: string; amountLabel: string }) {
  const stripe = useMemo(() => getStripe(publishableKey), [publishableKey]);
  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: { colorPrimary: "#f25a00", colorBackground: "#1e1e1b", colorText: "#f0ebe0", fontFamily: "Barlow, sans-serif", borderRadius: "10px" },
        },
      }}
    >
      <PayForm bookingId={bookingId} amountLabel={amountLabel} />
    </Elements>
  );
}
