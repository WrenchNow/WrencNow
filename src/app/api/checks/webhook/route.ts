import { NextResponse } from "next/server";
import { statusFromEvent, verifyCheckrSignature, type CheckrEvent } from "@/lib/checkr";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimEvent, releaseEvent } from "@/lib/webhook-events";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyCheckrSignature(body, request.headers.get("x-checkr-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: CheckrEvent;
  try {
    event = JSON.parse(body) as CheckrEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!event?.id || !event.type || !event.data?.object) return NextResponse.json({ error: "invalid event" }, { status: 400 });

  if (!(await claimEvent("checkr", event.id, event.type))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const status = statusFromEvent(event);
    const obj = event.data.object;
    const candidateId = obj.candidate_id ?? (obj.object === "candidate" ? obj.id : undefined);
    if (status && candidateId) {
      const admin = createAdminClient();
      const update: { check_status: typeof status; checkr_report_id?: string } = { check_status: status };
      if (obj.object === "report") update.checkr_report_id = obj.id;
      const { data } = await admin.from("mechanics").update(update).eq("checkr_candidate_id", candidateId).select("id").maybeSingle();
      if (data) {
        await admin.from("audit_log").insert({ action: `check.${status}`, entity: "mechanic", entity_id: data.id, data: { event: event.type, object: obj.id } });
      }
    }
  } catch (e) {
    await releaseEvent("checkr", event.id);
    console.error("checkr webhook failed", event.type, e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
