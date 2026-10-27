export const SKILL_TIERS = ["basic", "certified", "master"] as const;
export type SkillTier = (typeof SKILL_TIERS)[number];

const RANK: Record<SkillTier, number> = { basic: 1, certified: 2, master: 3 };

/** Mirrors public.tier_rank() in the database. */
export function tierRank(tier: SkillTier): number {
  return RANK[tier];
}

/** A mechanic may take a job only if the job's required tier is at or below theirs. */
export function canTakeJob(mechanicTier: SkillTier, requiredTier: SkillTier): boolean {
  return tierRank(requiredTier) <= tierRank(mechanicTier);
}

export const TIER_LABEL: Record<SkillTier, string> = {
  basic: "Basic",
  certified: "Certified",
  master: "Master",
};

export const TIER_DESCRIPTION: Record<SkillTier, string> = {
  basic: "Oil changes, batteries, wipers, filters, bulbs, tire rotations, jump starts.",
  certified: "Adds brakes, diagnostics, AC, tune-ups, electrical, suspension.",
  master: "Adds timing belts, transmission work, and European vehicles.",
};
