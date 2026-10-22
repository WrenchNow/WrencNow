/**
 * Shared helpers for Pantry Pal's Netlify Functions: env vars, JSON responses, body limits,
 * the same-origin guard and the "one person" id used by the free caps. No npm imports.
 */
import { createHmac } from 'node:crypto';

/**
 * Env var from the Netlify UI (scope must include Functions). Empty string counts as unset.
 * Falls back to process.env, where the Anthropic SDK itself looks for the AI Gateway's injected key.
 */
export const env = k => { const v = Netlify.env.get(k) ?? process.env[k]; return v == null || v === '' ? undefined : String(v); };
/** Positive whole-number env var, or the default. */
export const envInt = (k, d) => { const n = Math.floor(Number(env(k))); return Number.isFinite(n) && n > 0 ? n : d; };

const BASE_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { ...BASE_HEADERS, ...headers } });

/** Reads the body with a hard size cap (Content-Length can be missing or wrong). Returns null if too big or not a JSON object. */
export async function readJSON(req, max) {
  const len = Number(req.headers.get('Content-Length') || 0);
  if (len > max) return null;
  const text = await req.text();
  if (text.length > max) return null;
  try { const v = JSON.parse(text); return v && typeof v === 'object' ? v : null; } catch { return null; }
}

/**
 * The app, the site and the API are one Netlify project on one domain, so browsers call /api same-origin
 * and no CORS headers are needed. Extra origins (e.g. a local dev copy) can be listed in ALLOWED_ORIGIN
 * (comma-separated); only those get CORS headers.
 */
const extraOrigins = () => (env('ALLOWED_ORIGIN') || '').split(',').map(s => s.trim()).filter(Boolean);
function originAllowed(req) {
  const origin = req.headers.get('Origin');
  if (!origin) return true;                                   // curl, server-to-server, same-origin GET in some browsers
  try { if (new URL(origin).host === new URL(req.url).host) return true; } catch { return false; }
  return extraOrigins().includes(origin);
}
function corsHeaders(req) {
  const origin = req.headers.get('Origin');
  if (!origin || !extraOrigins().includes(origin)) return {};
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-App-Token, X-Premium, Authorization', 'Access-Control-Expose-Headers': 'X-Quota-Left, X-Quota-Limit', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' };
}

/**
 * Wraps a handler with: CORS preflight for listed origins only, a cross-site block (another website
 * can't spend visitors' free AI with a hidden form post), the optional APP_TOKEN check and a JSON 500.
 */
export function route(handler, { appToken = true } = {}) {
  return async (req, context) => {
    const cors = corsHeaders(req);
    const withCors = res => { for (const [k, v] of Object.entries(cors)) res.headers.set(k, v); return res; };
    if (req.method === 'OPTIONS') return new Response(null, { status: originAllowed(req) ? 204 : 403, headers: cors });
    if (!originAllowed(req)) return json({ error: 'This API only works from the Pantry Pal app.' }, 403);
    const token = env('APP_TOKEN');
    if (appToken && token && req.headers.get('X-App-Token') !== token) return withCors(json({ error: 'Invalid app token. Check Settings → App token.' }, 401));
    try { return withCors(await handler(req, context)); }
    catch (err) { console.error(err); return withCors(json({ error: 'Server error. Try again in a minute.' }, 500)); }
  };
}

/** One "person" = one IPv4 address, or one IPv6 /64 (a single home or phone usually gets a whole /64). */
export function clientId(ip) {
  ip = String(ip || 'unknown');
  if (!ip.includes(':')) return ip;
  const [head, tail = ''] = ip.split('::');
  const h = head ? head.split(':') : [], t = tail ? tail.split(':') : [];
  const full = ip.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h;
  return full.slice(0, 4).map(x => (x || '0').toLowerCase().replace(/^0+(?=.)/, '')).join(':') + '::/64';
}
/** Storage key for a person: a keyed hash, so raw IP addresses are never stored. */
export const personKey = context => createHmac('sha256', env('PREMIUM_SIGNING_SECRET') || 'pantry-pal-usage')
  .update(clientId(context?.ip)).digest('base64url').slice(0, 22);

/** UTC calendar day / month. The free caps reset at 00:00 UTC (6 pm MDT / 5 pm MST in Denver). */
export const utcDay = (now = new Date()) => now.toISOString().slice(0, 10);
export const utcMonth = (now = new Date()) => now.toISOString().slice(0, 7);
