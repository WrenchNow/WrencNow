import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold tracking-[0.18em] text-ore uppercase">{children}</p>;
}

export function PageHeader({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-1 text-4xl leading-none font-extrabold uppercase sm:text-5xl">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-ink">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

export function SetupRequired({ what }: { what: string }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-warn/25 bg-warn-dim px-4 py-3 text-sm text-ink" role="status">
      <p className="font-semibold text-warn">Not connected yet</p>
      <p className="mt-1">{what} isn&apos;t configured on this deployment yet. This page will work as soon as the keys are added.</p>
    </div>
  );
}
