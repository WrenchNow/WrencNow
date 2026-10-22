import { shortDate } from "@/lib/format";

export type ReviewItem = { id: string; reviewer_name: string; rating: number; body: string | null; created_at: string };

export function Stars({ rating, label }: { rating: number; label?: string }) {
  const full = Math.round(rating);
  return (
    <span className="text-warn" aria-label={label ?? `${rating} out of 5 stars`}>
      {"★".repeat(full)}
      <span className="text-line-strong">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function ReviewList({ reviews }: { reviews: ReviewItem[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <Stars rating={r.rating} />
            <span className="text-xs text-muted">{shortDate(r.created_at)}</span>
          </div>
          {r.body && <p className="mt-3 text-sm text-ink">{r.body}</p>}
          <p className="mt-3 text-xs font-semibold text-cream">— {r.reviewer_name} · verified booking</p>
        </li>
      ))}
    </ul>
  );
}
