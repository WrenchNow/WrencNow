// Netlify scheduled function: once a day, pay out verification-fee installments that have
// cleared the waiting period. Needs CRON_SECRET set in Netlify env vars.
export default async function handler() {
  const base = process.env.URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const res = await fetch(`${base}/api/cron/verification-refunds`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
  });
  console.log("verification refunds sweep", res.status, await res.text());
}

export const config = { schedule: "17 15 * * *" }; // daily, ~9:17am Denver
