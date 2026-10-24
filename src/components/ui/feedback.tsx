import type { ReactNode } from "react";

type Tone = "info" | "ok" | "warn" | "danger" | "ore" | "neutral";

const tones: Record<Tone, string> = {
  info: "bg-info-dim text-info border-info/25",
  ok: "bg-ok-dim text-ok border-ok/25",
  warn: "bg-warn-dim text-warn border-warn/25",
  danger: "bg-danger-dim text-danger border-danger/25",
  ore: "bg-ore-dim text-ore-bright border-ore/25",
  neutral: "bg-raised text-ink border-line",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  return (
    <div className={`rounded-[var(--radius-control)] border px-4 py-3 text-sm ${tones[tone]}`} role={tone === "danger" ? "alert" : "status"}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1 text-ink" : "text-ink"}>{children}</div>}
    </div>
  );
}

export function EmptyState({
  icon = "🔧",
  title,
  children,
  action,
}: {
  icon?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/50 px-6 py-12 text-center">
      <div className="mb-3 text-3xl" aria-hidden>
        {icon}
      </div>
      <h3 className="text-xl font-bold uppercase">{title}</h3>
      {children && <div className="mt-2 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
