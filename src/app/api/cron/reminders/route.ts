import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { retryCheckFeeRefunds } from "@/lib/check-fee";
import { sendMaintenanceReminders } from "@/lib/reminders-job";

export const runtime = "nodejs";

// Called daily by the Netlify scheduled function (netlify/functions/reminders.mjs) with `Authorization: Bearer <CRON_SECRET>`.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 503 });
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Same daily run also retries any background-check fee refunds that didn't go through.
  const [reminders, checkFeeRefunds] = await Promise.all([sendMaintenanceReminders(), retryCheckFeeRefunds().catch((e) => ({ error: String(e) }))]);
  return NextResponse.json({ ...reminders, checkFeeRefunds });
}
