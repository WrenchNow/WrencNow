import { describe, expect, it } from "vitest";
import { bayesianRating, noShowRate, rankScore, sortMechanics, type RankInput } from "@/lib/ranking";

const base: RankInput = { rating_avg: null, review_count: 0, completed_jobs: 0, no_show_count: 0, featured: false, online: false, distance_miles: 5 };
const m = (o: Partial<RankInput> & { id: string; hourly_rate_cents?: number }) => ({ ...base, hourly_rate_cents: 8_000, ...o });

describe("ranking", () => {
  it("smooths ratings so one 5★ review doesn't beat many great reviews", () => {
    expect(bayesianRating(5, 1)).toBeLessThan(bayesianRating(4.9, 60));
  });
  it("weights reviews heavily over featured status", () => {
    const strong = m({ id: "strong", rating_avg: 4.9, review_count: 80, completed_jobs: 80 });
    const paid = m({ id: "paid", featured: true });
    expect(rankScore(strong)).toBeGreaterThan(rankScore(paid));
  });
  it("featured breaks ties between otherwise equal mechanics", () => {
    const a = m({ id: "a", rating_avg: 4.8, review_count: 20, completed_jobs: 20 });
    const b = m({ id: "b", rating_avg: 4.8, review_count: 20, completed_jobs: 20, featured: true });
    expect(sortMechanics([a, b])[0]!.id).toBe("b");
  });
  it("penalizes no-shows", () => {
    const reliable = m({ id: "reliable", rating_avg: 4.7, review_count: 30, completed_jobs: 30 });
    const flaky = m({ id: "flaky", rating_avg: 4.8, review_count: 30, completed_jobs: 30, no_show_count: 8 });
    expect(sortMechanics([flaky, reliable])[0]!.id).toBe("reliable");
    expect(noShowRate(0, 0)).toBe(0);
    expect(noShowRate(1, 3)).toBe(0.25);
  });
  it("supports nearest and price sorts", () => {
    const near = m({ id: "near", distance_miles: 1, hourly_rate_cents: 12_000 });
    const cheap = m({ id: "cheap", distance_miles: 9, hourly_rate_cents: 6_000 });
    expect(sortMechanics([cheap, near], "nearest")[0]!.id).toBe("near");
    expect(sortMechanics([near, cheap], "price")[0]!.id).toBe("cheap");
  });
});
