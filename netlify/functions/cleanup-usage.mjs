/**
 * Scheduled: deletes old free-cap counters from the Blobs "usage" store (Blobs has no automatic expiry).
 *
 * Schedule "30 0 * * *" = every day at 00:30 UTC (6:30 pm MDT in summer, 5:30 pm MST in winter, Denver time),
 * 30 minutes after the daily caps reset at 00:00 UTC. Keeps today + yesterday and this month + last month.
 * Runs only on the published production deploy, has a 30 s limit and stops at 25 s; leftovers go next night.
 * It can't be called from a URL. Correctness never depends on it: old dates are simply never read again.
 */
import { usageStore, cleanupUsage } from '../lib/counters.mjs';

export default async () => {
  const r = await cleanupUsage(usageStore());
  console.log(`cleanup-usage: deleted ${r.deleted} old counters${r.done ? '' : ' (more left for next run)'}`);
};

export const config = { schedule: '30 0 * * *' };
