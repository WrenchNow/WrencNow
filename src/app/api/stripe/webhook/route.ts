import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { handleStripeEvent } from "@/lib/stripe-events";
import { getStripe } from "@/lib/stripe";
import { claimEvent, releaseEvent } from "@/lib/webhook-events";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter((s): s is string => Boolean(s));
  if (!signature || secrets.length === 0) {
    return NextResponse.json({ error: "missing signature or webhook secret" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = getStripe().webhooks.constructEvent(body, signature, secret);
      break;
    } catch {
      // try the next secret
    }
  }
  if (!event) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

  if (!(await claimEvent("stripe", event.id, event.type))) {
    return NextResponse.json({ received: true, duplicate: true });
  }
  try {
    await handleStripeEvent(event);
  } catch (e) {
    await releaseEvent("stripe", event.id);
    console.error("stripe webhook failed", event.type, e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
