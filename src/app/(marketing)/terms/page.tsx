import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = { title: "Terms of Service" };

export default function Page() {
  return <LegalDoc doc="terms" title="Terms of Service" />;
}
