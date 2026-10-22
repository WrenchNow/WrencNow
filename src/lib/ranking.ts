/**
 * Search ranking. Reviews dominate: a Bayesian-smoothed rating (so one 5★ review
 * doesn't beat fifty 4.8★ reviews) times a confidence factor from review volume.
 * No-shows are a heavy penalty. Featured is a boost, not an override. Distance
 * and availability break ties.
 */
export type RankInput = {
  rating_avg: number | null;
  review_count: number;
  completed_jobs: number;
  no_show_count: number;
  featured: boolean;
  online: boolean;
  distance_miles: number;
};

const PRIOR_MEAN = 4.0; // assumed rating for a mechanic with no reviews
const PRIOR_WEIGHT = 5; // reviews' worth of weight given to the prior

export function bayesianRating(avg: number | null, count: number): number {
  if (!count || avg === null) return PRIOR_MEAN;
  return (PRIOR_MEAN * PRIOR_WEIGHT + avg * count) / (PRIOR_WEIGHT + count);
}

export function noShowRate(noShows: number, completed: number): number {
  const total = noShows + completed;
  return total === 0 ? 0 : noShows / total;
}

export function rankScore(m: RankInput): number {
  const rating = bayesianRating(m.rating_avg, m.review_count); // 1–5
  const reviewWeight = 60 * (rating / 5); // up to 60 points
  const volume = 10 * Math.min(1, Math.log10(1 + m.review_count) / 2); // up to 10 at ~100 reviews
  const reliability = -40 * noShowRate(m.no_show_count, m.completed_jobs); // up to −40
  const featured = m.featured ? 8 : 0;
  const online = m.online ? 4 : 0;
  const distance = -Math.min(10, m.distance_miles / 2.5); // up to −10 at 25 mi
  return reviewWeight + volume + reliability + featured + online + distance;
}

export type SortKey = "best" | "nearest" | "price";

export function sortMechanics<T extends RankInput & { hourly_rate_cents: number | null }>(list: T[], sort: SortKey = "best"): T[] {
  const copy = [...list];
  if (sort === "nearest") return copy.sort((a, b) => a.distance_miles - b.distance_miles);
  if (sort === "price") return copy.sort((a, b) => (a.hourly_rate_cents ?? Infinity) - (b.hourly_rate_cents ?? Infinity));
  return copy.sort((a, b) => rankScore(b) - rankScore(a));
}
