import { describe, expect, it } from "vitest";
import { actorMayTransition, BOOKING_STATUSES, canCancel, canTransition, isTerminal, noShowReportable } from "@/lib/booking-status";
import { insuranceDaysRemaining } from "@/lib/mechanic";

describe("booking status machine", () => {
  it("follows the happy path", () => {
    expect(canTransition("requested", "accepted")).toBe(true);
    expect(canTransition("accepted", "en_route")).toBe(true);
    expect(canTransition("en_route", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "completed")).toBe(true);
  });
  it("blocks skipping steps and going backwards", () => {
    expect(canTransition("requested", "completed")).toBe(false);
    expect(canTransition("requested", "in_progress")).toBe(false);
    expect(canTransition("accepted", "requested")).toBe(false);
    expect(canTransition("completed", "in_progress")).toBe(false);
  });
  it("can't cancel once work has started", () => {
    expect(canTransition("in_progress", "cancelled")).toBe(false);
    expect(canTransition("en_route", "cancelled")).toBe(true);
  });
  it("terminal states have no exits", () => {
    for (const s of ["completed", "cancelled", "no_show"] as const) {
      expect(isTerminal(s)).toBe(true);
      for (const to of BOOKING_STATUSES) expect(canTransition(s, to)).toBe(false);
    }
  });
  it("only mechanics move jobs forward; only customers report no-shows", () => {
    expect(actorMayTransition("customer", "accepted")).toBe(false);
    expect(actorMayTransition("customer", "completed")).toBe(false);
    expect(actorMayTransition("mechanic", "completed")).toBe(true);
    expect(actorMayTransition("mechanic", "no_show")).toBe(false);
    expect(actorMayTransition("customer", "no_show")).toBe(true);
    expect(actorMayTransition("customer", "cancelled")).toBe(true);
    expect(actorMayTransition("admin", "completed")).toBe(true);
  });
  it("no-show can be reported only after the 30-minute grace period", () => {
    const start = "2026-10-22T16:00:00Z";
    const t = Date.parse(start);
    expect(noShowReportable("accepted", start, t + 29 * 60_000)).toBe(false);
    expect(noShowReportable("accepted", start, t + 31 * 60_000)).toBe(true);
    expect(noShowReportable("requested", start, t + 60 * 60_000)).toBe(false);
    expect(noShowReportable("in_progress", start, t + 60 * 60_000)).toBe(false);
  });
  it("mechanics can only decline; once accepted they're committed", () => {
    expect(canCancel("mechanic", "requested")).toBe(true);
    expect(canCancel("mechanic", "accepted")).toBe(false);
    expect(canCancel("mechanic", "en_route")).toBe(false);
  });
  it("customers cancel free until the mechanic is on the way", () => {
    expect(canCancel("customer", "requested")).toBe(true);
    expect(canCancel("customer", "accepted")).toBe(true);
    expect(canCancel("customer", "en_route")).toBe(false);
  });
  it("admins can cancel up to the start of work", () => {
    expect(canCancel("admin", "en_route")).toBe(true);
    expect(canCancel("admin", "in_progress")).toBe(false);
  });
});

describe("insurance expiry", () => {
  const now = new Date("2026-10-22T18:00:00Z");
  it("counts whole days remaining", () => {
    expect(insuranceDaysRemaining("2026-11-21", now)).toBe(30);
    expect(insuranceDaysRemaining("2026-10-22", now)).toBe(0);
    expect(insuranceDaysRemaining("2026-10-20", now)).toBe(-2);
    expect(insuranceDaysRemaining(null, now)).toBeNull();
  });
});
