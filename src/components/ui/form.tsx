import type { ComponentProps, ReactNode } from "react";

const control =
  "w-full rounded-[var(--radius-control)] border border-line-strong bg-raised px-3.5 py-3 text-[15px] text-cream placeholder:text-muted focus:border-ore focus:outline-none";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  /** Shows a required marker (the control itself should also carry `required`). */
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-cream">
        {label}
        {required && <RequiredMark />}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Asterisk for required fields; screen readers hear "required". */
export function RequiredMark() {
  return (
    <>
      <span aria-hidden className="ml-0.5 text-ore">
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

/** Legend shown at the top of forms that mark required fields. */
export function RequiredLegend() {
  return (
    <p className="text-xs text-muted">
      <span aria-hidden className="text-ore">
        *
      </span>{" "}
      Required
    </p>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${control} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${control} min-h-24 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${control} ${className}`} {...props} />;
}

export function Checkbox({ label, id, ...props }: ComponentProps<"input"> & { label: ReactNode; id: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-ink">
      <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-ore)]" {...props} />
      <span>{label}</span>
    </label>
  );
}
