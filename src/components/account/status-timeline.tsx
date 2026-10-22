import { STATUS_LABEL, type BookingStatus } from "@/lib/booking-status";

const FLOW: BookingStatus[] = ["requested", "accepted", "en_route", "in_progress", "completed"];

export function StatusTimeline({ status }: { status: BookingStatus }) {
  if (status === "cancelled" || status === "no_show") {
    return <p className="rounded-[var(--radius-control)] border border-danger/25 bg-danger-dim px-4 py-3 text-sm font-semibold text-danger">{STATUS_LABEL[status]}</p>;
  }
  const idx = FLOW.indexOf(status);
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:gap-0">
      {FLOW.map((s, i) => (
        <li key={s} className="flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-2 sm:text-center" aria-current={i === idx ? "step" : undefined}>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
              i < idx ? "border-ok bg-ok-dim text-ok" : i === idx ? "border-ore bg-ore text-on-ore" : "border-line-strong text-muted"
            }`}
          >
            {i < idx ? "✓" : i + 1}
          </span>
          <span className={`text-sm ${i <= idx ? "text-cream" : "text-muted"}`}>{STATUS_LABEL[s]}</span>
        </li>
      ))}
    </ol>
  );
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const tone =
    status === "completed"
      ? "border-ok/25 bg-ok-dim text-ok"
      : status === "cancelled" || status === "no_show"
        ? "border-danger/25 bg-danger-dim text-danger"
        : status === "requested"
          ? "border-warn/25 bg-warn-dim text-warn"
          : "border-ore/25 bg-ore-dim text-ore-bright";
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{STATUS_LABEL[status]}</span>;
}
