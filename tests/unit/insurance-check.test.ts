import { describe, expect, it } from "vitest";
import { checkCertificate, datesIn } from "@/lib/insurance-check";

const ACORD = `ACORD CERTIFICATE OF LIABILITY INSURANCE DATE (MM/DD/YYYY) 10/20/2026
INSURED Jamie R. Rivera DBA Rivera Mobile Auto LLC 1234 Main St Denver CO 80205
INSURER A : Progressive Commercial Insurance Co
COMMERCIAL GENERAL LIABILITY  POLICY NUMBER  CGL-0098 7765  POLICY EFF 11/01/2026  POLICY EXP 11/01/2027
EACH OCCURRENCE $1,000,000`;

const claim = { names: ["Jamie Rivera", "Rivera Mobile Auto"], provider: "Progressive", policyNumber: "CGL00987765", expiresOn: "2027-11-01" };

describe("certificate of insurance auto-check", () => {
  it("passes a certificate that matches everything the mechanic typed", () => {
    const r = checkCertificate(ACORD, claim, "2026-10-28");
    expect(r.checks.filter((c) => !c.ok)).toEqual([]);
    expect(r.pass).toBe(true);
  });

  it("fails on a wrong policy number or expiration date", () => {
    expect(checkCertificate(ACORD, { ...claim, policyNumber: "CGL-1111111" }, "2026-10-28").pass).toBe(false);
    expect(checkCertificate(ACORD, { ...claim, expiresOn: "2028-11-01" }, "2026-10-28").pass).toBe(false);
  });

  it("fails when the mechanic isn't the insured, or the policy is expired", () => {
    expect(checkCertificate(ACORD, { ...claim, names: ["Pat Smith"] }, "2026-10-28").pass).toBe(false);
    expect(checkCertificate(ACORD, claim, "2027-12-01").pass).toBe(false);
  });

  it("fails on something that isn't a certificate", () => {
    expect(checkCertificate("Jamie Rivera CGL00987765 Progressive 11/01/2027 liability", claim, "2026-10-28").checks.find((c) => c.key === "certificate")?.ok).toBe(false);
  });

  it("reads dates in common formats", () => {
    expect(datesIn("exp 11/01/2027, 3-5-27, 2028-01-09, Oct 31, 2027")).toEqual(expect.arrayContaining(["2027-11-01", "2027-03-05", "2028-01-09", "2027-10-31"]));
  });
});

/** A one-page PDF with the given lines of text (Helvetica), built by hand so the test needs no fixtures. */
function makePdf(lines: string[]): Uint8Array {
  const esc = (t: string) => t.replace(/[\\()]/g, (c) => `\\${c}`);
  const content = `BT /F1 10 Tf 40 760 Td 14 TL ${lines.map((l) => `(${esc(l)}) Tj T*`).join(" ")} ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}

describe("reading a real PDF certificate", () => {
  it("extracts the text and passes the check end to end", async () => {
    const { pdfText } = await import("@/lib/pdf-text");
    const text = await pdfText(makePdf(ACORD.split("\n")));
    expect(text).toContain("CERTIFICATE OF LIABILITY INSURANCE");
    expect(checkCertificate(text, claim, "2026-10-28").pass).toBe(true);
  });
});
