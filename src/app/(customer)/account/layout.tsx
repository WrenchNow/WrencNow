import Link from "next/link";
import { Container } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";

const TABS = [
  { href: "/account", label: "Overview" },
  { href: "/account/bookings", label: "Bookings" },
  { href: "/account/garage", label: "Garage" },
  { href: "/account/business", label: "Business" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["customer"], "/account");
  return (
    <Container className="py-10 sm:py-14">
      <nav aria-label="Account" className="mb-8 flex gap-1 overflow-x-auto rounded-[var(--radius-control)] border border-line bg-surface p-1">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink hover:bg-raised hover:text-cream">
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </Container>
  );
}
