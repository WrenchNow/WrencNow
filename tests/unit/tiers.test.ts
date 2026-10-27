import { describe, expect, it } from "vitest";
import { canTakeJob, SKILL_TIERS, tierRank } from "@/lib/tiers";

describe("skill-tier gating", () => {
  it("basic mechanics can only take basic jobs", () => {
    expect(canTakeJob("basic", "basic")).toBe(true);
    expect(canTakeJob("basic", "certified")).toBe(false);
    expect(canTakeJob("basic", "master")).toBe(false);
  });
  it("certified mechanics take basic and certified, not master", () => {
    expect(canTakeJob("certified", "basic")).toBe(true);
    expect(canTakeJob("certified", "certified")).toBe(true);
    expect(canTakeJob("certified", "master")).toBe(false);
  });
  it("master mechanics take everything", () => {
    for (const t of SKILL_TIERS) expect(canTakeJob("master", t)).toBe(true);
  });
  it("ranks are strictly increasing", () => {
    expect(tierRank("basic")).toBeLessThan(tierRank("certified"));
    expect(tierRank("certified")).toBeLessThan(tierRank("master"));
  });
});
