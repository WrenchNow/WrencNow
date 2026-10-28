import type { ReactNode } from "react";
import { Container, Eyebrow } from "@/components/ui/layout";

export const STEPS = [
  {
    title: "Describe the problem",
    body: "“Makes a weird noise when I brake” is a perfect description. No mechanic knowledge needed — just tell us what you're experiencing.",
  },
  {
    title: "Pick your time slot",
    body: "Choose a time that works this week. Your mechanic confirms in the app. No calls, no back-and-forth.",
  },
  {
    title: "They come to you",
    body: "Your mechanic shows up at your driveway, parking lot, or office. Bring your coffee — you don't move an inch.",
  },
  {
    title: "Pay when it's done",
    body: "We hold the estimate on your card when you book. You're charged the final amount only after the job is complete — never more than the estimate you approved.",
  },
];

export const TRUST = [
  {
    title: "Vetted before they arrive",
    body: "Every mechanic is reviewed and insured before they can take a job. Look for the “Background checked” badge — you always see it before you book.",
  },
  {
    title: "Reviews you can trust",
    body: "Only customers with a completed booking can leave a review. No anonymous stars, no paid reviews.",
  },
  {
    title: "No-shows on the record",
    body: "If a mechanic doesn't show, it's recorded on their public profile and pushes them down in search.",
  },
  {
    title: "Plain English, always",
    body: "Your mechanic explains what's wrong and what it'll cost before touching anything. No jargon, no pressure.",
  },
];

export function Steps() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s, i) => (
        <li key={s.title} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <span className="font-display text-4xl font-black text-ore">{String(i + 1).padStart(2, "0")}</span>
          <h3 className="mt-3 text-xl font-bold uppercase">{s.title}</h3>
          <p className="mt-2 text-sm text-ink">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function TrustGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {TRUST.map((t) => (
        <div key={t.title} className="flex gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ok-dim text-ok" aria-hidden>
            ✓
          </span>
          <div>
            <h3 className="text-lg font-bold uppercase">{t.title}</h3>
            <p className="mt-1 text-sm text-ink">{t.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Section({ eyebrow, title, intro, children, className = "" }: { eyebrow?: string; title: string; intro?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`py-16 sm:py-20 ${className}`}>
      <Container>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-1 text-4xl leading-none font-extrabold uppercase sm:text-5xl">{title}</h2>
        {intro && <p className="mt-3 max-w-2xl text-ink">{intro}</p>}
        <div className="mt-10">{children}</div>
      </Container>
    </section>
  );
}

const MARQUEE = ["Your driveway", "Your parking lot", "Your office", "Your schedule", "Your mechanic", "Your door"];

export function Marquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="overflow-hidden border-y border-line bg-surface py-4" aria-hidden>
      <div className="flex w-max animate-[marquee_30s_linear_infinite] gap-8 whitespace-nowrap">
        {items.map((t, i) => (
          <span key={i} className="font-display text-xl font-extrabold tracking-wider text-muted uppercase">
            {t} <span className="ml-8 text-ore">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
