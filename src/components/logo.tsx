import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`font-display text-2xl leading-none font-black tracking-wide uppercase ${className}`} aria-label="WrenchNow home">
      <span className="text-cream">Wrench</span>
      <span className="text-ore">Now</span>
    </Link>
  );
}
