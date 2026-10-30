import Link from "next/link";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "For customers",
    links: [
      { href: "/search", label: "Find a mechanic" },
      { href: "/services", label: "Services" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/faq", label: "FAQ" },
      { href: "/booking-protection", label: "Booking protection" },
      { href: "/payment-protection", label: "Payment protection" },
    ],
  },
  {
    title: "For mechanics",
    links: [
      { href: "/for-mechanics", label: "Why WrenchNow" },
      { href: "/signup?role=mechanic", label: "Apply now" },
      { href: "/mechanic-agreement", label: "Mechanic agreement" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/support", label: "Support & contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">
            Mobile mechanics, on demand. We bring the garage to you — driveway, parking lot, anywhere your car is.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-bold tracking-wider uppercase">{col.title}</h2>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted hover:text-cream">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} WrenchNow · Launching in Denver, CO
        </p>
      </div>
    </footer>
  );
}
