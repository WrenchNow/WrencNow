import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Database } from "@/types/database";

type CheckStatus = Database["public"]["Enums"]["check_status"];

function base() {
  return (process.env.CHECKR_API_BASE || "https://api.checkr-staging.com").replace(/\/$/, "");
}

async function checkr<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.CHECKR_API_KEY;
  if (!key) throw new Error("CHECKR_API_KEY is not set");
  const res = await fetch(`${base()}/v1${path}`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Checkr ${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

/**
 * Creates a Checkr candidate and emails them an invitation to complete the
 * background check (Checkr collects SSN/DOB/consent — we never touch them).
 */
export async function startBackgroundCheck(input: { email: string; firstName: string; lastName: string; city: string | null; state?: string }) {
  const candidate = await checkr<{ id: string }>("/candidates", {
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    work_locations: [{ country: "US", state: input.state ?? "CO", ...(input.city ? { city: input.city } : {}) }],
  });
  const invitation = await checkr<{ id: string }>("/invitations", {
    candidate_id: candidate.id,
    package: process.env.CHECKR_PACKAGE || "tasker_standard",
    work_locations: [{ country: "US", state: input.state ?? "CO", ...(input.city ? { city: input.city } : {}) }],
  });
  return { candidateId: candidate.id, invitationId: invitation.id };
}

/** Checkr signs webhooks with HMAC-SHA256 of the raw body using the API key. */
export function verifyCheckrSignature(rawBody: string, signature: string | null): boolean {
  const key = process.env.CHECKR_API_KEY;
  if (!key || !signature) return false;
  const expected = createHmac("sha256", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type CheckrEvent = {
  id: string;
  type: string;
  data: { object: { id: string; object: string; status?: string; result?: string | null; adjudication?: string | null; candidate_id?: string } };
};

/** Map a Checkr event to our check_status, or null if it doesn't change it. */
export function statusFromEvent(event: CheckrEvent): CheckStatus | null {
  const obj = event.data.object;
  switch (event.type) {
    case "invitation.created":
      return "invited";
    case "invitation.completed":
    case "report.created":
      return "pending";
    case "invitation.expired":
    case "invitation.deleted":
    case "report.canceled":
      return "canceled";
    case "report.suspended":
      return "suspended";
    case "report.completed":
    case "report.upgraded":
      if (obj.adjudication === "engaged") return "clear";
      if (obj.result === "clear") return "clear";
      if (obj.result === "consider") return "consider";
      return "pending";
    case "report.engaged":
      return "clear";
    case "report.pre_adverse_action":
    case "report.post_adverse_action":
      return "consider";
    default:
      return null;
  }
}
