import legal from "@/content/legal.json";
import { customerNoShowFeeCents, onboardingFeePerJobCents, onboardingFeeTotalCents, partsHandlingBps, platformFeeBps } from "@/lib/env";
import { processingLabel } from "@/lib/fee-copy";
import { money } from "@/lib/format";
import { Container } from "./ui/layout";

type Block = { p?: string; ul?: string[] };
type Doc = { intro: Block[]; sections: { heading: string; blocks: Block[] }[] };

const LAST_UPDATED = "October 30, 2026";

function feePercent(): string {
  try {
    return `${platformFeeBps() / 100}%`;
  } catch {
    return "the percentage shown in your mechanic dashboard";
  }
}

function Blocks({ blocks }: { blocks: Block[] }) {
  const fee = feePercent();
  return (
    <>
      {blocks.map((b, i) =>
        b.ul ? (
          <ul key={i} className="my-3 list-disc space-y-1.5 pl-5">
            {b.ul.map((li) => (
              <li key={li}>{li}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className={`my-3 ${b.p!.endsWith(":") ? "font-semibold text-cream" : ""}`}>
            {b
              .p!.replace("{{PLATFORM_FEE_PERCENT}}", fee)
              .replace("{{PROCESSING_FEE}}", processingLabel())
              .replace("{{PARTS_HANDLING}}", `${partsHandlingBps() / 100}%`)
              .replace("{{ONBOARDING_TOTAL}}", money(onboardingFeeTotalCents(), { whole: true }))
              .replace("{{ONBOARDING_PER_JOB}}", money(onboardingFeePerJobCents(), { whole: true }))
              .replace("{{CUSTOMER_NO_SHOW_FEE}}", money(customerNoShowFeeCents(), { whole: true }))
}
          </p>
        ),
      )}
    </>
  );
}

export function LegalDoc({ doc, title }: { doc: keyof typeof legal; title: string }) {
  const content = legal[doc] as Doc;
  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <h1 className="text-4xl font-extrabold uppercase sm:text-5xl">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated: {LAST_UPDATED}</p>
      <div className="mt-8 text-[15px] leading-relaxed text-ink">
        <Blocks blocks={content.intro} />
        {content.sections.map((s) => (
          <section key={s.heading} className="mt-8">
            <h2 className="text-2xl font-bold uppercase">{s.heading}</h2>
            <Blocks blocks={s.blocks} />
          </section>
        ))}
      </div>
    </Container>
  );
}
