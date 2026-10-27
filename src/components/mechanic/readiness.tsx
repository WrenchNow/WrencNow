import type { ReadinessStep } from "@/lib/mechanic";
import { Card } from "@/components/ui/card";

export function Readiness({ steps, live }: { steps: ReadinessStep[]; live: boolean }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold uppercase">Go-live checklist</h2>
        <span className="text-sm text-muted">
          {done}/{steps.length}
        </span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-raised">
        <div className="h-2 rounded-full bg-ore" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-5 space-y-4">
        {steps.map((s) => (
          <li key={s.key} className="flex gap-3">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${s.done ? "border-ok bg-ok-dim text-ok" : "border-line-strong text-muted"}`} aria-hidden>
              {s.done ? "✓" : ""}
            </span>
            <span>
              <span className={`block text-sm font-semibold ${s.done ? "text-cream" : "text-ink"}`}>
                {s.label}
                <span className="sr-only">{s.done ? " (done)" : " (to do)"}</span>
              </span>
              <span className="block text-xs text-muted">{s.detail}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className={`mt-5 rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold ${live ? "bg-ok-dim text-ok" : "bg-raised text-muted"}`}>
        {live ? "● You're live — customers can find and book you." : "Customers can't see you until every step is done."}
      </p>
    </Card>
  );
}
