import Link from "next/link";
import { getViewer, homeFor } from "@/lib/auth";
import { initials } from "@/lib/format";
import { Logo } from "./logo";
import { buttonClass } from "./ui/button";

const NAV = [
  { href: "/search", label: "Find a Mechanic" },
  { href: "/services", label: "Services" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/for-mechanics", label: "For Mechanics" },
  { href: "/pricing", label: "Pricing" },
];

export async function SiteHeader() {
  const viewer = await getViewer();
  const name = viewer?.profile?.full_name || viewer?.email || "";
  const dashboard = viewer ? homeFor(viewer.profile?.role) : null;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-muted transition hover:text-cream">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {viewer ? (
            <>
              <Link href={dashboard!} className="flex items-center gap-2 text-sm text-cream">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ore text-xs font-bold text-on-ore" aria-hidden>
                  {initials(name)}
                </span>
                <span className="max-w-32 truncate">Dashboard</span>
              </Link>
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-sm text-muted hover:text-danger">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-muted hover:text-cream">
                Log in
              </Link>
              <Link href="/signup" className={buttonClass("primary", "sm")}>
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu: native <details> so it works before hydration */}
        <details className="group relative md:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-[var(--radius-control)] border border-line-strong text-cream [&::-webkit-details-marker]:hidden">
            <span className="sr-only">Open menu</span>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="group-open:hidden">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="hidden group-open:block">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </summary>
          <div className="absolute right-0 mt-2 w-64 rounded-[var(--radius-card)] border border-line-strong bg-surface p-3 shadow-2xl">
            <nav aria-label="Mobile" className="flex flex-col">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-lg px-3 py-3 text-cream hover:bg-raised">
                  {n.label}
                </Link>
              ))}
              <div className="my-2 border-t border-line" />
              {viewer ? (
                <>
                  <Link href={dashboard!} className="rounded-lg px-3 py-3 text-cream hover:bg-raised">
                    Dashboard
                  </Link>
                  <form action="/auth/signout" method="post">
                    <button type="submit" className="w-full rounded-lg px-3 py-3 text-left text-muted hover:bg-raised hover:text-danger">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="rounded-lg px-3 py-3 text-cream hover:bg-raised">
                    Log in
                  </Link>
                  <Link href="/signup" className={buttonClass("primary", "md", "mt-1")}>
                    Sign up free
                  </Link>
                </>
              )}
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
