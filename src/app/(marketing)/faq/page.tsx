import type { Metadata } from "next";
import { FaqList } from "@/components/faq-list";
import { Container, PageHeader } from "@/components/ui/layout";
import { CUSTOMER_FAQ, MECHANIC_FAQ } from "@/content/faq";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";

export const metadata: Metadata = { title: "FAQ", description: "Answers about booking, pricing, payments, and joining WrenchNow as a mechanic." };

export default function FaqPage() {
  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <PageHeader eyebrow="Pricing and policies, explained" title="FAQ" />
      <h2 className="mb-4 text-2xl font-bold uppercase">For customers</h2>
      <FaqList items={CUSTOMER_FAQ} />
      <h2 className="mt-12 mb-4 text-2xl font-bold uppercase">For mechanics</h2>
      <FaqList items={MECHANIC_FAQ} />
      <p className="mt-10 text-sm text-muted">
        Still have a question? Email{" "}
        <a href={CONTACT_MAILTO} className="text-ore hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </Container>
  );
}
