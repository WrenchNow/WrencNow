import "server-only";
import { CONTACT_EMAIL } from "@/lib/contact";
import { siteUrl } from "@/lib/env";
import { dateTime, money, timeOnly } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Email (Resend) and SMS (Twilio) notifications. Each channel turns on when its keys
 * are set and is skipped otherwise. Every send is logged in `notifications` under a
 * unique key, so a retried event never messages anyone twice. Never throws.
 */

type Message = { subject: string; text: string; sms?: string };

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function smsConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID));
}

/** US numbers → E.164 (+1XXXXXXXXXX). Returns null if it doesn't look like a phone number. */
export function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function sendEmail(to: string, msg: Message) {
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1e1e1b">${escapeHtml(msg.text)
    .replace(/\n/g, "<br>")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#f25a00">$1</a>')}<p style="color:#6e6b62;font-size:12px;margin-top:24px">WrenchNow · Denver, CO</p></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject: msg.subject, text: msg.text, html }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const form = new URLSearchParams({ To: to, Body: body });
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) form.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  else form.set("From", process.env.TWILIO_FROM!);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}` },
    body: form,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
}

/** Send once per key per channel. */
async function deliver(key: string, recipient: { email?: string | null; phone?: string | null }, template: string, msg: Message) {
  const admin = createAdminClient();
  const jobs: Promise<void>[] = [];
  const attempt = async (channel: "email" | "sms", to: string, send: () => Promise<void>) => {
    const { error } = await admin.from("notifications").insert({ key: `${key}:${channel}`, channel, recipient: to, template });
    if (error) return; // already sent (unique key) — don't repeat
    try {
      await send();
    } catch (e) {
      await admin.from("notifications").update({ status: "failed", error: String(e).slice(0, 500) }).eq("key", `${key}:${channel}`);
    }
  };
  if (recipient.email && emailConfigured()) jobs.push(attempt("email", recipient.email, () => sendEmail(recipient.email!, msg)));
  const phone = toE164(recipient.phone);
  if (msg.sms && phone && smsConfigured()) jobs.push(attempt("sms", phone, () => sendSms(phone, `WrenchNow: ${msg.sms}`)));
  await Promise.all(jobs);
}

async function contactFor(userId: string) {
  const admin = createAdminClient();
  const [{ data: user }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("profiles").select("full_name, phone").eq("id", userId).maybeSingle(),
  ]);
  return { email: user.user?.email ?? null, phone: profile?.phone ?? null, name: profile?.full_name?.split(" ")[0] ?? "there" };
}

export type BookingEvent = "requested" | "accepted" | "en_route" | "arrived" | "completed" | "cancelled" | "no_show" | "customer_no_show";

/** Notify the right party about a booking change. Best-effort: logs and swallows errors. */
export async function notifyBooking(bookingId: string, event: BookingEvent) {
  if (!emailConfigured() && !smsConfigured()) return;
  try {
    const admin = createAdminClient();
    const { data: b } = await admin.from("bookings").select("*, services(name), mechanics(display_name)").eq("id", bookingId).single();
    if (!b) return;
    const service = b.services?.name ?? "your service";
    const mechanicName = b.mechanics?.display_name ?? "Your mechanic";
    const when = dateTime(b.scheduled_start);
    const customerLink = `${siteUrl()}/account/bookings/${b.id}`;
    const mechanicLink = `${siteUrl()}/mechanic/jobs#${b.id}`;

    const toCustomer = async (msg: Message) => deliver(`booking:${b.id}:${event}:customer`, await contactFor(b.customer_id), event, msg);
    const toMechanic = async (msg: Message) => deliver(`booking:${b.id}:${event}:mechanic`, await contactFor(b.mechanic_id), event, msg);

    switch (event) {
      case "requested":
        return toMechanic({
          subject: `New job request: ${service}, ${when}`,
          text: `You have a new request: ${service} on ${when} (${b.vehicle_desc}).\nUp to ${money(b.estimated_max_cents)}. Accept or decline: ${mechanicLink}`,
          sms: `New job: ${service}, ${when}. Accept or decline: ${mechanicLink}`,
        });
      case "accepted":
        return toCustomer({
          subject: `${mechanicName} accepted your booking`,
          text: `${mechanicName} accepted your ${service} booking for ${when}.\nYour 4-digit arrival code is on your booking page — read it to them when they arrive: ${customerLink}`,
          sms: `${mechanicName} accepted your ${service} booking for ${when}. Your arrival code is in the app: ${customerLink}`,
        });
      case "en_route":
        return toCustomer({
          subject: `${mechanicName} is on the way`,
          text: `${mechanicName} is on the way for your ${service}. Have your arrival code ready: ${customerLink}`,
          sms: `${mechanicName} is on the way. Have your arrival code ready: ${customerLink}`,
        });
      case "arrived": {
        const deadline = b.arrived_at ? timeOnly(new Date(Math.max(Date.parse(b.arrived_at), Date.parse(b.scheduled_start)) + 15 * 60_000)) : "";
        return toCustomer({
          subject: `${mechanicName} is here`,
          text: `${mechanicName} has arrived at ${b.address}. Please meet them and read them your arrival code. If you don't respond by ${deadline}, a no-show fee may be charged. ${customerLink}`,
          sms: `${mechanicName} is at your car now. Meet them with your arrival code by ${deadline} to avoid a no-show fee. ${customerLink}`,
        });
      }
      case "completed": {
        const lines = [
          `Receipt — ${service}`,
          `Mechanic: ${mechanicName}`,
          `Vehicle: ${b.vehicle_desc}`,
          `Address: ${b.address}`,
          `Completed: ${b.completed_at ? dateTime(b.completed_at) : when}`,
          b.labor_cents !== null ? `Labor: ${money(b.labor_cents)}` : null,
          b.parts_cents !== null ? `Parts: ${money(b.parts_cents)}` : null,
          `Total charged: ${money(b.final_amount_cents)}`,
          b.return_old_parts ? "Old parts: returned to you" : null,
          `Reference: ${b.id.slice(0, 8)}`,
          "",
          `Leave a review: ${customerLink}`,
        ].filter((l) => l !== null);
        return toCustomer({ subject: `Your WrenchNow receipt — ${money(b.final_amount_cents)}`, text: lines.join("\n") });
      }
      case "cancelled": {
        const msg = (who: string) => ({
          subject: `Booking cancelled: ${service}, ${when}`,
          text: `The ${service} booking for ${when} was cancelled${b.cancel_reason ? ` (${b.cancel_reason})` : ""}. ${who}`,
          sms: `Your ${service} booking for ${when} was cancelled.`,
        });
        await toCustomer(msg(`Any hold on your card has been released. Find another mechanic: ${siteUrl()}/search`));
        await toMechanic(msg(""));
        return;
      }
      case "no_show":
        return toMechanic({
          subject: `No-show reported: ${service}, ${when}`,
          text: `The customer reported that you didn't arrive for ${service} on ${when}. It's recorded on your profile. If you were there, reply to this email.`,
          sms: `The customer reported a no-show for ${service} on ${when}.`,
        });
      case "customer_no_show":
        return toCustomer({
          subject: `No-show fee charged: ${money(b.customer_no_show_fee_cents)}`,
          text: `Your mechanic arrived at ${b.address} for ${service} and waited, but couldn't reach you, so a ${money(b.customer_no_show_fee_cents)} no-show fee was charged instead of the job. If this is wrong, reply to this email. ${customerLink}`,
          sms: `Your mechanic couldn't reach you, so a ${money(b.customer_no_show_fee_cents)} no-show fee was charged. Reply to our email if this is wrong.`,
        });
    }
  } catch (e) {
    console.error("notifyBooking failed", bookingId, event, e);
  }
}

/** Email the owner/admin (ADMIN_EMAIL). */
export async function notifyAdmin(key: string, subject: string, text: string) {
  const to = process.env.ADMIN_EMAIL || CONTACT_EMAIL;
  if (!to) return;
  try {
    await deliver(`admin:${key}`, { email: to }, "admin", { subject, text });
  } catch (e) {
    console.error("notifyAdmin failed", key, e);
  }
}

/** Email someone without an account (e.g. an open request from a visitor). */
export async function notifyEmail(key: string, email: string, subject: string, text: string) {
  try {
    await deliver(key, { email }, "direct", { subject, text });
  } catch (e) {
    console.error("notifyEmail failed", key, e);
  }
}

/** Parts quote events: customer gets the quote to approve; mechanic hears the answer. */
export async function notifyBookingParts(bookingId: string, event: "quoted" | "approved" | "declined") {
  if (!emailConfigured() && !smsConfigured()) return;
  try {
    const admin = createAdminClient();
    const { data: b } = await admin.from("bookings").select("*, services(name), mechanics(display_name)").eq("id", bookingId).single();
    if (!b) return;
    const version = b.parts_quote_sent_at ?? "";
    const mechanicName = b.mechanics?.display_name ?? "Your mechanic";
    if (event === "quoted") {
      const link = `${siteUrl()}/account/bookings/${b.id}`;
      return deliver(`booking:${b.id}:parts_quoted:${version}:customer`, await contactFor(b.customer_id), "parts_quoted", {
        subject: `${mechanicName} sent a parts quote`,
        text: `${mechanicName} sent an itemized parts quote for your ${b.services?.name ?? "job"}. Review and approve it before they buy the parts: ${link}`,
        sms: `${mechanicName} sent a parts quote. Review and approve it: ${link}`,
      });
    }
    const link = `${siteUrl()}/mechanic/jobs#${b.id}`;
    return deliver(`booking:${b.id}:parts_${event}:${version}:mechanic`, await contactFor(b.mechanic_id), `parts_${event}`, {
      subject: event === "approved" ? "Parts quote approved — you can buy the parts" : "Parts quote declined",
      text:
        event === "approved"
          ? `The customer approved your parts quote. Buy the parts and upload each receipt in the app: ${link}`
          : `The customer declined your parts quote. Talk with them and send a new quote if needed: ${link}`,
      sms: event === "approved" ? `Parts quote approved. Upload receipts in the app: ${link}` : `Parts quote declined: ${link}`,
    });
  } catch (e) {
    console.error("notifyBookingParts failed", bookingId, event, e);
  }
}

/** Send a one-off message to a user by id (email/SMS per configured channels). */
export async function notifyUser(key: string, userId: string, msg: { subject: string; text: string; sms?: string }) {
  if (!emailConfigured() && !smsConfigured()) return;
  try {
    await deliver(key, await contactFor(userId), "direct", msg);
  } catch (e) {
    console.error("notifyUser failed", key, e);
  }
}
