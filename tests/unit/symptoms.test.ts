import { describe, expect, it } from "vitest";
import { analyzeSymptoms } from "@/lib/symptoms";

describe("analyzeSymptoms", () => {
  it("matches a plain-English no-start description to battery and jump start", () => {
    const [top] = analyzeSymptoms("My car won't start, it just clicks");
    expect(top?.id).toBe("no-start-click");
    expect(top?.services).toContain("battery");
  });

  it("flags overheating as stop-driving", () => {
    const [top] = analyzeSymptoms("temperature gauge in the red and steam from the hood");
    expect(top?.id).toBe("overheating");
    expect(top?.safety).toBe("stop");
  });

  it("puts the strongest match first", () => {
    const res = analyzeSymptoms("brakes squeal and grind when I stop");
    expect(res[0]?.id).toBe("brakes");
  });

  it("returns nothing for unrelated or empty text", () => {
    expect(analyzeSymptoms("")).toEqual([]);
    expect(analyzeSymptoms("hello there")).toEqual([]);
  });

  it("only suggests services that exist in the catalog", () => {
    const catalog = new Set(["estimate-visit", "oil-change", "battery", "wipers", "air-filters", "bulbs", "tire-rotation", "jump-start", "brakes", "check-engine", "ac-heat", "spark-plugs", "electrical", "suspension", "pre-purchase-inspection", "starter-alternator", "cooling-system", "serpentine-belt", "timing-belt", "transmission", "european"]);
    const samples = ["won't start", "brakes grind", "check engine light", "overheating", "ac blows warm", "lights flicker", "clunk over bumps", "belt squeal", "rough idle", "transmission slipping", "oil leak puddle", "oil change due"];
    for (const s of samples) for (const m of analyzeSymptoms(s, 5)) for (const slug of m.services) expect(catalog.has(slug), `${s} → ${slug}`).toBe(true);
  });
});
