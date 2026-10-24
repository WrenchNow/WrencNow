import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { statusFromEvent, verifyCheckrSignature, type CheckrEvent } from "@/lib/checkr";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
const { safeNext } = await import("@/lib/auth");

const ev = (type: string, obj: Partial<CheckrEvent["data"]["object"]> = {}): CheckrEvent => ({
  id: "evt_1",
  type,
  data: { object: { id: "rpt_1", object: "report", candidate_id: "cand_1", ...obj } },
});

describe("checkr", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("verifies HMAC signatures with the API key", () => {
    vi.stubEnv("CHECKR_API_KEY", "test_key");
    const body = JSON.stringify({ hello: "world" });
    const sig = createHmac("sha256", "test_key").update(body).digest("hex");
    expect(verifyCheckrSignature(body, sig)).toBe(true);
    expect(verifyCheckrSignature(body + " ", sig)).toBe(false);
    expect(verifyCheckrSignature(body, null)).toBe(false);
    expect(verifyCheckrSignature(body, "deadbeef")).toBe(false);
  });
  it("rejects everything when no key is configured", () => {
    vi.stubEnv("CHECKR_API_KEY", "");
    expect(verifyCheckrSignature("{}", "anything")).toBe(false);
  });
  it("maps report results to check status", () => {
    expect(statusFromEvent(ev("report.completed", { result: "clear" }))).toBe("clear");
    expect(statusFromEvent(ev("report.completed", { result: "consider" }))).toBe("consider");
    expect(statusFromEvent(ev("report.completed", { result: "consider", adjudication: "engaged" }))).toBe("clear");
    expect(statusFromEvent(ev("report.suspended"))).toBe("suspended");
    expect(statusFromEvent(ev("invitation.completed"))).toBe("pending");
    expect(statusFromEvent(ev("report.post_adverse_action"))).toBe("consider");
    expect(statusFromEvent(ev("candidate.updated"))).toBeNull();
  });
});

describe("safeNext", () => {
  it("allows same-site paths only", () => {
    expect(safeNext("/account")).toBe("/account");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext(null, "/x")).toBe("/x");
  });
});
