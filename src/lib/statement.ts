// Month helpers for statements. Months are "YYYY-MM" in Denver time (matching monthKey).
const TZ_OFFSET_GUESS = "-07:00";

/** UTC range covering a Denver calendar month. */
export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const offset = (ym: string) => {
    // Denver is UTC-7 in winter and UTC-6 in summer. DST can end on the 1st (e.g. Nov 1, 2026) at 2am local,
    // so probe at 07:00 UTC — local midnight or 1am, before any switch.
    const [yy, mm] = ym.split("-").map(Number) as [number, number];
    const probe = new Date(Date.UTC(yy, mm - 1, 1, 7));
    const name = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", timeZoneName: "shortOffset" }).formatToParts(probe).find((p) => p.type === "timeZoneName")?.value;
    const h = name?.match(/GMT([+-]\d+)/)?.[1];
    return h ? `${h.startsWith("-") ? "-" : "+"}${String(Math.abs(Number(h))).padStart(2, "0")}:00` : TZ_OFFSET_GUESS;
  };
  const start = new Date(`${month}-01T00:00:00${offset(month)}`).toISOString();
  const end = new Date(`${next}-01T00:00:00${offset(next)}`).toISOString();
  const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));
  return { start, end, label };
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
