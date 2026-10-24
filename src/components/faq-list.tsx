import type { Faq } from "@/content/faq";

export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold text-cream [&::-webkit-details-marker]:hidden">
            {f.q}
            <span className="text-ore transition group-open:rotate-45" aria-hidden>
              +
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-ink">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
