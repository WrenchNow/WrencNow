import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/feedback";
import { initials, money } from "@/lib/format";
import { TIER_LABEL, type SkillTier } from "@/lib/tiers";

export type MechanicCardData = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  city: string | null;
  skill_tier: SkillTier;
  hourly_rate_cents: number | null;
  years_experience: number | null;
  specialties: string[] | null;
  rating_avg: number | null;
  review_count: number;
  completed_jobs: number;
  no_show_count: number;
  featured: boolean;
  online: boolean;
  distance_miles?: number;
};

export function Avatar({ name, url, size = 56 }: { name: string | null; url: string | null; size?: number }) {
  if (url) return <Image src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-ore-dim font-display font-bold text-ore" style={{ width: size, height: size, fontSize: size / 2.6 }} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function MechanicCard({ m, service }: { m: MechanicCardData; service?: string }) {
  const href = service ? `/mechanics/${m.id}?service=${encodeURIComponent(service)}` : `/mechanics/${m.id}`;
  return (
    <li className={`relative rounded-[var(--radius-card)] border bg-surface p-5 transition hover:border-ore/60 ${m.featured ? "border-warn/40" : "border-line"}`}>
      <div className="flex gap-4">
        <Avatar name={m.display_name} url={m.photo_url} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-xl font-bold uppercase">
              <Link href={href} className="after:absolute after:inset-0">
                {m.display_name ?? "WrenchNow mechanic"}
              </Link>
            </h3>
            {m.featured && <Badge tone="warn">Sponsored</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {TIER_LABEL[m.skill_tier]} mechanic
            {m.city ? ` · ${m.city}` : ""}
            {m.distance_miles !== undefined ? ` · ${m.distance_miles.toFixed(1)} mi away` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {m.review_count > 0 && m.rating_avg !== null ? (
              <span className="text-cream">
                <span className="text-warn">★</span> {Number(m.rating_avg).toFixed(1)} <span className="text-muted">({m.review_count})</span>
              </span>
            ) : (
              <span className="text-muted">New — no reviews yet</span>
            )}
            {m.completed_jobs > 0 && <span className="text-muted">{m.completed_jobs} jobs</span>}
            {m.no_show_count > 0 && <span className="text-danger">{m.no_show_count} no-show{m.no_show_count > 1 ? "s" : ""}</span>}
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold text-cream">{money(m.hourly_rate_cents, { whole: true })}</p>
          <p className="text-xs text-muted">/hr</p>
          {m.online && (
            <p className="mt-2 text-xs font-semibold text-ok">
              <span aria-hidden>●</span> Online
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
