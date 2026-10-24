import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6 ${className}`} {...props} />;
}
