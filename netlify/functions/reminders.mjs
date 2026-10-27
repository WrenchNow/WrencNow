// Netlify scheduled function: once a day, ask the app to send maintenance reminders.
// Needs CRON_SECRET set in Netlify (any long random string). Does nothing harmful if email isn't configured.
async function sendReminders() {
  const base = process.env.URL; // Netlify sets this to the site's main URL
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) return new Response("not configured", { status: 200 });
  const res = await fetch(`${base}/api/cron/reminders`, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
  return new Response(await res.text(), { status: res.status });
}

export default sendReminders;

export const config = { schedule: "@daily" };
