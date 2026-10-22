import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processAllVerificationRefunds } from "@/lib/verification";

export const runtime = "nodejs";

/** Daily sweep that pays out earned verification-fee installments. Called by the Netlify scheduled function. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await processAllVerificationRefunds();
  return NextResponse.json(result);
}
