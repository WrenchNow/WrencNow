import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

export const POPULAR_SERVICES = [
  { slug: "oil-change", label: "Oil change", icon: "🛢" },
  { slug: "brakes", label: "Brakes", icon: "🛑" },
  { slug: "battery", label: "Battery", icon: "🔋" },
  { slug: "tire-rotation", label: "Tires", icon: "🔄" },
  { slug: "ac-heat", label: "AC / Heat", icon: "❄️" },
  { slug: "check-engine", label: "Check engine", icon: "🔍" },
  { slug: "transmission", label: "Transmission", icon: "⚙️" },
  { slug: "electrical", label: "Electrical", icon: "🔌" },
];

/** Plain GET form → /search. Works without JavaScript. */
export function SearchForm({ defaultLocation = "", defaultService = "" }: { defaultLocation?: string; defaultService?: string }) {
  return (
    <form action="/search" method="get" className="rounded-[var(--radius-card)] border border-line-strong bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold uppercase">Find a mechanic</h2>
        <span className="text-xs text-muted">Free to browse · no account needed</span>
      </div>
      <label htmlFor="hero-loc" className="mt-4 block text-sm font-medium text-cream">
        Where&apos;s the car?
      </label>
      <Input id="hero-loc" name="loc" required defaultValue={defaultLocation} placeholder="Address or ZIP, e.g. 80205" autoComplete="postal-code" className="mt-1.5" />
      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-cream">What does it need?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {POPULAR_SERVICES.map((s) => (
            <label key={s.slug} className="cursor-pointer">
              <input type="radio" name="service" value={s.slug} defaultChecked={defaultService === s.slug} className="peer sr-only" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-raised px-3 py-1.5 text-sm text-ink transition peer-checked:border-ore peer-checked:bg-ore-dim peer-checked:text-cream peer-focus-visible:outline-2 peer-focus-visible:outline-ore-bright">
                <span aria-hidden>{s.icon}</span>
                {s.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" size="lg" className="mt-5 w-full">
        Show me mechanics near me
      </Button>
      <p className="mt-3 text-center text-xs text-muted">Pay through the app only when the job&apos;s done.</p>
    </form>
  );
}
