import Link from "next/link";
import { Badge } from "@/components/ui/feedback";
import { Container } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { getMyMechanic } from "@/lib/mechanic";
import { TIER_LABEL } from "@/lib/tiers";

const NAV = [
  { href: "/mechanic/dashboard", label: "Dashboard" },
  { href: "/mechanic/jobs", label: "Jobs" },
  { href: "/mechanic/earnings", label: "Earnings" },
  { href: "/mechanic/onboarding", label: "Profile & setup" },
];

export default async function MechanicLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireRole(["mechanic"], "/mechanic/dashboard");
  const m = await getMyMechanic(viewer.id);
  return (
    <Container className="py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Mechanic" className="flex gap-1 overflow-x-auto rounded-[var(--radius-control)] border border-line bg-surface p-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink hover:bg-raised hover:text-cream">
              {n.label}
            </Link>
          ))}
        </nav>
        {m && (
          <div className="flex flex-wrap gap-2">
            <Badge tone="ore">{TIER_LABEL[m.skill_tier]} tier</Badge>
            {m.is_live ? <Badge tone="ok">● Live</Badge> : <Badge tone="warn">Not live yet</Badge>}
          </div>
        )}
      </div>
      {children}
    </Container>
  );
}
