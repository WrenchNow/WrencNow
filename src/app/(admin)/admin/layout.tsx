import Link from "next/link";
import { Container } from "@/components/ui/layout";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/mechanics", label: "Mechanics" },
  { href: "/admin/bookings", label: "Bookings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireRole(["admin"], "/admin");
  if (viewer.profile.role !== "admin") redirect("/");
  return (
    <Container className="py-10 sm:py-14">
      <nav aria-label="Admin" className="mb-8 flex gap-1 overflow-x-auto rounded-[var(--radius-control)] border border-line bg-surface p-1">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink hover:bg-raised hover:text-cream">
            {n.label}
          </Link>
        ))}
      </nav>
      {children}
    </Container>
  );
}
