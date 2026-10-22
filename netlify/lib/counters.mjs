/**
 * Usage counters on Netlify Blobs (store "usage", strong consistency).
 *
 * Blobs has no atomic increment and no per-key expiry, so:
 *  - every increment is a compare-and-swap (set with onlyIfMatch / onlyIfNew) with a few retries,
 *    so two requests at the same moment can't both take the last free slot;
 *  - keys carry their own date (day/YYYY-MM-DD/… or month/YYYY-MM/…). Old dates are never read again,
 *    and the scheduled function cleanup-usage deletes them every night.
 *
 * If a counter can't be read or written, the caller fails CLOSED (no AI call), so a storage hiccup
 * can never turn into an uncapped AI bill.
 */
import { getStore } from '@netlify/blobs';

export const usageStore = () => getStore({ name: 'usage', consistency: 'strong' });
export const communityStore = () => getStore({ name: 'community', consistency: 'strong' });

const TRIES = 5;
/**
 * Reads a key with its ETag, for compare-and-swap. Returns null when the key doesn't exist.
 * Some Blobs servers don't send an ETag on reads (netlify dev's local emulator doesn't; production is
 * UNVERIFIED), but list() always does. Then: etag from list() FIRST, value second, so a write in between
 * makes the later onlyIfMatch fail and retry instead of losing a count.
 */
export async function readVersioned(store, key, type) {
  const cur = await store.getWithMetadata(key, type ? { type, consistency: 'strong' } : { consistency: 'strong' });
  if (!cur) return null;
  if (cur.etag) return { data: cur.data, etag: cur.etag };
  const { blobs } = await store.list({ prefix: key });
  const etag = blobs.find(b => b.key === key)?.etag;
  if (!etag) throw new Error(`No ETag for ${key}`);
  const data = await store.get(key, type ? { type, consistency: 'strong' } : { consistency: 'strong' });
  return data == null ? null : { data, etag };
}
export async function peek(store, key) {
  const v = await store.get(key, { consistency: 'strong' });
  return Number(v) || 0;
}
/** Adds 1 unless the count is already at limit. Returns { ok: true, count } or { ok: false } when full. Throws on storage errors or contention. */
export async function take(store, key, limit) {
  for (let i = 0; i < TRIES; i++) {
    const cur = await readVersioned(store, key);
    const n = cur ? Number(cur.data) || 0 : 0;
    if (n >= limit) return { ok: false, count: n };
    const res = cur
      ? await store.set(key, String(n + 1), { onlyIfMatch: cur.etag })
      : await store.set(key, String(n + 1), { onlyIfNew: true });
    if (res && res.modified) return { ok: true, count: n + 1 };
  }
  throw new Error(`Counter ${key} is busy`);
}
/** Best-effort undo of take() when a later cap in the same request said no. */
export async function refund(store, key) {
  try {
    for (let i = 0; i < TRIES; i++) {
      const cur = await readVersioned(store, key);
      const n = cur ? Number(cur.data) || 0 : 0;
      if (!cur || n <= 0) return;
      const res = await store.set(key, String(n - 1), { onlyIfMatch: cur.etag });
      if (res && res.modified) return;
    }
  } catch { /* the slot stays used; the cap only gets slightly stricter */ }
}

/**
 * Checks and takes every cap in order (biggest pool first), all or nothing.
 * caps: [{ key, limit, msg }]. Returns null when allowed (and sets cap.count on each), else
 * { error, cap } for the cap that is full, or { error: busyMsg, busy: true } when storage failed.
 */
export async function takeAll(store, caps, busyMsg) {
  try {
    // Read first so a full person/day never writes anything.
    const counts = await Promise.all(caps.map(c => peek(store, c.key)));
    const full = caps.find((c, i) => counts[i] >= c.limit);
    if (full) return { error: full.msg, cap: full };
  } catch { return { error: busyMsg, busy: true }; }
  const taken = [];
  try {
    for (const c of caps) {
      const r = await take(store, c.key, c.limit);
      if (!r.ok) { await Promise.all(taken.map(k => refund(store, k))); return { error: c.msg, cap: c }; }
      c.count = r.count; taken.push(c.key);
    }
    return null;
  } catch {
    await Promise.all(taken.map(k => refund(store, k)));
    return { error: busyMsg, busy: true };
  }
}

/**
 * Deletes counters from past days and months. Keeps today and yesterday (UTC), and this month and last month.
 * Stops early when the deadline passes; whatever is left goes on the next run.
 */
export async function cleanupUsage(store, now = new Date(), deadline = Date.now() + 25000) {
  const y = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  const lm = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  let deleted = 0, done = true;
  for (const [prefix, keepFrom, re] of [['day/', y, /^day\/(\d{4}-\d{2}-\d{2})\//], ['month/', lm, /^month\/(\d{4}-\d{2})\//]]) {
    const { blobs } = await store.list({ prefix });
    const old = blobs.map(b => b.key).filter(k => { const m = k.match(re); return m && m[1] < keepFrom; });
    for (let i = 0; i < old.length; i += 20) {
      if (Date.now() > deadline) { done = false; break; }
      await Promise.all(old.slice(i, i + 20).map(k => store.delete(k)));
      deleted += Math.min(20, old.length - i);
    }
  }
  return { deleted, done };
}
