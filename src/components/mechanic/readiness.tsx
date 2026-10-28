import Link from "next/link";
import type { ReadinessStep } from "@/lib/mechanic";
import { Card } from "@/components/ui/card";

export function Readiness({ steps, live }: { steps: ReadinessStep[]; live: boolean }) {
  const required = steps.filter((s) => !s.optional);
  const done = required.filter((s) => s.done).length;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold uppercase">Go-live checklist</h2>
        <span className="text-sm text-muted">
          {done}/{required.length}
        </span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-raised">
        <div className="h-2 rounded-full bg-ore" style={{ width: `${(done / required.length) * 100}%` }} />
      </div>
      <ol className="mt-5 space-y-1">
        {steps.map((s) => (
          <li key={s.key}>
            <Link href={s.href} className="group -mx-2 flex gap-3 rounded-[var(--radius-control)] px-2 py-2 transition hover:bg-raised">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${s.done ? "border-ok bg-ok-dim text-ok" : "border-line-strong text-muted"}`}
                aria-hidden
              >
                {s.done ? "✓" : ""}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${s.done ? "text-cream" : "text-ink"} group-hover:text-ore`}>
                  {s.label}
                  {s.optional && <span className="ml-1.5 text-xs font-normal text-muted">(optional)</span>}
                  <span className="sr-only">{s.done ? " (done)" : " (to do)"}</span>
                </span>
                <span className="block text-xs text-muted">{s.detail}</span>
              </span>
              {!s.done && (
                <span aria-hidden className="self-center text-ore">
                  →
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
      <p className={`mt-5 rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold ${live ? "bg-ok-dim text-ok" : "bg-raised text-muted"}`}>
        {live ? "● You're live — customers can find and book you." : "Customers can't see you until every required step is done."}
      </p>
    </Card>
  );
}
