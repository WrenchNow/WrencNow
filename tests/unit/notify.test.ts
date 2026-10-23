import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => { throw new Error("should not touch the database"); }) }));
const { emailConfigured, notifyBooking, smsConfigured, toE164 } = await import("@/lib/notify");

describe("phone numbers for SMS", () => {
  it("normalizes US numbers to E.164", () => {
    expect(toE164("(303) 555-0100")).toBe("+13035550100");
    expect(toE164("303.555.0100")).toBe("+13035550100");
    expect(toE164("1-303-555-0100")).toBe("+13035550100");
    expect(toE164("+44 20 7946 0958")).toBe("+442079460958");
  });
  it("rejects things that aren't phone numbers", () => {
    expect(toE164("555-0100")).toBeNull();
    expect(toE164("")).toBeNull();
    expect(toE164(null)).toBeNull();
  });
});

describe("notifications stay off until keys are set", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("reports channels as unconfigured without keys", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "");
    expect(emailConfigured()).toBe(false);
    expect(smsConfigured()).toBe(false);
  });
  it("sends nothing (and doesn't touch the database) when unconfigured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(notifyBooking("00000000-0000-0000-0000-000000000000", "accepted")).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("needs both the key and a sender address for email", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "");
    expect(emailConfigured()).toBe(false);
    vi.stubEnv("EMAIL_FROM", "WrenchNow <hello@getwrenchnow.com>");
    expect(emailConfigured()).toBe(true);
  });
});
