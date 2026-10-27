import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Page() {
  return <LegalDoc doc="privacy" title="Privacy Policy" />;
}
