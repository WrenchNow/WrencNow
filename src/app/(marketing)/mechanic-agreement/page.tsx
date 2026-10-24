import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = { title: "Mechanic Independent Contractor Agreement" };

export default function Page() {
  return <LegalDoc doc="mechanicAgreement" title="Mechanic Independent Contractor Agreement" />;
}
