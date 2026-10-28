// Automatic first-pass check of an uploaded certificate of insurance (COI). Pure — tested.
// Compares what the mechanic typed against the text of their certificate. Only a certificate
// that clearly matches on every point is auto-verified; anything else waits for a person.

export type InsuranceClaim = {
  /** Mechanic's legal name and/or business name as they appear on the profile. */
  names: string[];
  provider: string;
  policyNumber: string;
  /** YYYY-MM-DD, as typed. */
  expiresOn: string;
};

export type InsuranceCheck = { pass: boolean; checks: { key: string; ok: boolean; note: string }[] };

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** Letters and digits only, upper-case: "AB-123 456" → "AB123456". */
function compact(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !["llc", "inc", "co", "corp", "the", "and", "dba"].includes(w));
}

/** Every date written on the certificate, as YYYY-MM-DD. Handles 10/31/2027, 10-31-27, 2027-10-31 and "Oct 31, 2027". */
export function datesIn(text: string): string[] {
  const out = new Set<string>();
  const add = (y: number, m: number, d: number) => {
    if (y < 100) y += 2000;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) out.add(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  };
  for (const m of text.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g)) add(Number(m[3]), Number(m[1]), Number(m[2]));
  for (const m of text.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) add(Number(m[1]), Number(m[2]), Number(m[3]));
  for (const m of text.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/gi)) add(Number(m[3]), MONTHS[m[1]!.toLowerCase()]!, Number(m[2]));
  return [...out];
}

export function checkCertificate(text: string, claim: InsuranceClaim, today: string = new Date().toISOString().slice(0, 10)): InsuranceCheck {
  const flat = compact(text);
  const lower = text.toLowerCase();
  const textWords = new Set(words(text));

  const policy = compact(claim.policyNumber);
  const policyOk = policy.length >= 5 && flat.includes(policy);

  const nameOk = claim.names.some((n) => {
    const w = words(n);
    return w.length > 0 && w.every((x) => textWords.has(x));
  });

  const providerWords = words(claim.provider).filter((w) => !["insurance", "ins", "company", "group", "mutual"].includes(w));
  const providerOk = providerWords.length > 0 && providerWords.some((w) => textWords.has(w));

  const dates = datesIn(text);
  const dateOk = dates.includes(claim.expiresOn);
  const notExpired = claim.expiresOn > today;

  const liabilityOk = /general liability|commercial general|garage liability|garagekeepers|liability/.test(lower);
  const certOk = /certificate of (liability )?insurance|acord/.test(lower);

  const checks = [
    { key: "certificate", ok: certOk, note: certOk ? "Looks like a certificate of insurance" : "Doesn't look like a certificate of insurance (no ACORD / certificate heading)" },
    { key: "name", ok: nameOk, note: nameOk ? "Insured name matches the profile" : "Mechanic's name isn't on the certificate" },
    { key: "policy", ok: policyOk, note: policyOk ? "Policy number matches" : "Policy number typed isn't on the certificate" },
    { key: "provider", ok: providerOk, note: providerOk ? "Insurance company matches" : "Insurance company typed isn't on the certificate" },
    { key: "expires", ok: dateOk, note: dateOk ? "Expiration date matches" : "Expiration date typed isn't on the certificate" },
    { key: "current", ok: notExpired, note: notExpired ? "Policy is current" : "Policy has expired" },
    { key: "liability", ok: liabilityOk, note: liabilityOk ? "Shows liability coverage" : "No liability coverage found" },
  ];
  return { pass: checks.every((c) => c.ok), checks };
}
