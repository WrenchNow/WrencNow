// Tests the real Netlify Functions (netlify/functions/*.mjs) in plain Node:
//   - Netlify.env:      MOCK, backed by process.env
//   - @netlify/blobs:   MOCK, in memory (tests/mocks/netlify-blobs.mjs), same conditional-write rules
//   - @anthropic-ai/sdk: the REAL SDK if `npm ci` was run (else tests/mocks/anthropic-sdk.mjs); either way
//                        every HTTP call goes to a FAKE fetch below. Nothing real is called.
// (File name kept from the Cloudflare Worker days so tests/run-all.mjs and old notes still find it.)
import { register } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHmac } from 'node:crypto';
register('./mocks/hooks.mjs', import.meta.url);

globalThis.Netlify = { env: { get: k => process.env[k], has: k => k in process.env, set: (k, v) => { process.env[k] = v; }, delete: k => { delete process.env[k]; }, toObject: () => ({ ...process.env }) }, context: null };
const blobs = await import('@netlify/blobs');
const fn = async name => (await import(`../netlify/functions/${name}.mjs`));
const F = { claude: await fn('claude'), community: await fn('community'), health: await fn('health'), amazon: await fn('amazon-search'), recipes: await fn('recipes-search'), mint: await fn('admin-mint'), redeem: await fn('premium-redeem'), cleanup: await fn('cleanup-usage') };
const { signPremium, verifyPremium } = await import('../netlify/lib/premium.mjs');
const { cleanupUsage } = await import('../netlify/lib/counters.mjs');
const realSdk = fs.existsSync(new URL('../node_modules/@anthropic-ai/sdk/package.json', import.meta.url));

let n = 0; const ok = (name) => { n++; console.log('ok   ' + name); };

/* ---------- fake upstream (Anthropic / Spoonacular) ---------- */
let upstream = [], reply = () => new Response(JSON.stringify({ id: 'msg_1', type: 'message', role: 'assistant', model: 'x', content: [{ type: 'text', text: 'hi' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url ?? String(input);
  const h = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  const raw = init.body ?? (input instanceof Request ? await input.text() : undefined);
  upstream.push({ url, headers: h, body: raw ? JSON.parse(raw) : undefined });
  return reply(url);
};

/* ---------- env ---------- */
const KEYS = ['PREMIUM_TEST_CODES', 'ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL', 'MODEL', 'LIST_MODEL', 'APP_TOKEN', 'ALLOWED_ORIGIN', 'FREE_DAILY_PER_USER', 'FREE_DAILY_TOTAL', 'FREE_LIST_PER_MONTH', 'FREE_LIST_DAILY_TOTAL', 'PREMIUM_PER_MONTH', 'PREMIUM_SIGNING_SECRET', 'ADMIN_TOKEN', 'COMMUNITY', 'SPOONACULAR_KEY', 'AMAZON_CLIENT_ID', 'AMAZON_CLIENT_SECRET', 'AMAZON_PARTNER_TAG'];
const SECRET = 'test-signing-secret-0123456789-abcdefghij', ADMIN = 'test-admin-token-0123456789-abcdefghijkl';
function fresh(extra = {}) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, { ANTHROPIC_API_KEY: 'sk-test', PREMIUM_SIGNING_SECRET: SECRET }, extra);
  blobs.__reset();
  return { usage: blobs.getStore({ name: 'usage', consistency: 'strong' }), community: blobs.getStore({ name: 'community', consistency: 'strong' }) };
}
const day = () => new Date().toISOString().slice(0, 10), month = () => new Date().toISOString().slice(0, 7);

/* ---------- request helpers ---------- */
const HOST = 'https://pantry-pal-test.netlify.app';
function req(path, body, extra = {}, method) {
  return new Request(HOST + path, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', ...extra }, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
}
async function call(f, path, body, ip = '1.2.3.4', headers = {}, method) {
  const r = await f.default(req(path, body, headers, method), { ip, geo: {}, site: {}, deploy: { context: 'production' } });
  const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data, headers: r.headers };
}
const claude = (b, ip, h) => call(F.claude, '/api/claude', b, ip, h);
const good = { system: 'sys', max_tokens: 999999, model: 'claude-opus-expensive', messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }] };
const img = { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AA' } };

let s, r;

/* ===== Same behaviour as the Worker ===== */
s = fresh();
r = await claude(good); assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(upstream.at(-1).body.model, 'claude-sonnet-5-5'); assert.equal(upstream.at(-1).body.max_tokens, 4096);
assert.deepEqual(Object.keys(upstream.at(-1).body).sort(), ['max_tokens', 'messages', 'model', 'system']);
assert.match(upstream.at(-1).url, /^https:\/\/api\.anthropic\.com\/v1\/messages/); assert.equal(upstream.at(-1).headers.get('x-api-key'), 'sk-test');
assert.equal(r.data.content[0].text, 'hi');
ok(`model forced server-side, max_tokens capped at 4096, extra fields dropped (${realSdk ? 'real' : 'stand-in'} Anthropic SDK)`);
process.env.MODEL = 'claude-test-model'; await claude(good, '9.9.9.1'); assert.equal(upstream.at(-1).body.model, 'claude-test-model'); delete process.env.MODEL;
ok('MODEL env var overrides the default model');

for (let i = 1; i < 8; i++) assert.equal((await claude(good)).status, 200);
r = await claude(good); assert.equal(r.status, 429); assert.equal(r.data.code, 'free_limit'); assert.match(r.data.error, /today’s 8 free AI reads/);
ok('per-person cap: 8 a day, then 429 free_limit');

s = fresh();
for (let i = 0; i < 8; i++) assert.equal((await claude(good, `2001:db8:aa:bb::${i + 1}`)).status, 200);
assert.equal((await claude(good, '2001:0db8:00aa:00bb:1234:5678:9abc:def0')).status, 429);
assert.equal((await claude(good, '2001:db8:aa:cc::1')).status, 200);
ok('IPv6 addresses in one /64 count as one person (context.ip)');
assert.ok(![...s.usage.m.keys()].some(k => k.includes('2001') || k.includes('1.2.3.4')), 'raw IPs must not be stored');
ok('raw IP addresses are never stored (keyed hash)');

s = fresh(); s.usage.put(`day/${day()}/total`, '300');
r = await claude(good); assert.equal(r.status, 429); assert.match(r.data.error, /capacity/);
ok('daily total cap: 300 for everyone');
s = fresh({ FREE_DAILY_TOTAL: '5', FREE_DAILY_PER_USER: '2' }); s.usage.put(`day/${day()}/total`, '5');
assert.equal((await claude(good)).status, 429);
ok('FREE_DAILY_TOTAL / FREE_DAILY_PER_USER env vars change the caps');

s = fresh(); s.usage.failSet = k => k.endsWith('/total');
r = await claude(good); assert.equal(r.status, 429); assert.match(r.data.error, /busy/); assert.equal(r.data.code, 'busy');
s = fresh(); s.usage.failGet = () => true; const u0 = upstream.length;
r = await claude(good); assert.equal(r.status, 429); assert.equal(upstream.length, u0);
ok('fails closed when the counter can’t be written or read (no AI call)');
s = fresh(); s.usage.failSet = k => k.includes('/user/');
r = await claude(good); assert.equal(r.status, 429); assert.equal(s.usage.peek(`day/${day()}/total`), '0');
ok('a failed per-person write refunds the daily total');

s = fresh(); s.usage.put(`day/${day()}/total`, '295');
const par = await Promise.all(Array.from({ length: 12 }, (_, i) => claude(good, `10.0.0.${i + 1}`)));
assert.equal(par.filter(x => x.status === 200).length, 5, par.map(x => x.status).join(','));
assert.equal(s.usage.peek(`day/${day()}/total`), '300');
ok('12 requests at once with 5 slots left: exactly 5 get through (compare-and-swap counters)');
s = fresh(); s.usage.noEtagOnRead = true; s.community.noEtagOnRead = true; s.usage.put(`day/${day()}/total`, '296');
for (let i = 0; i < 3; i++) assert.equal((await claude(good, '30.0.0.1')).status, 200);
const par2 = await Promise.all(Array.from({ length: 6 }, (_, i) => claude(good, `31.0.0.${i}`)));
assert.equal(par2.filter(x => x.status === 200).length, 1, par2.map(x => x.status).join(',')); assert.equal(s.usage.peek(`day/${day()}/total`), '300');
for (let i = 0; i < 2; i++) assert.equal((await call(F.community, '/api/community', { title: 'T' + i, ingredients: [{ qty: 1, unit: '', name: 'egg' }], steps: ['Cook.'] }, `32.0.0.${i}`)).status, 201);
assert.equal((await call(F.community, '/api/community')).data.recipes.length, 2);
ok('counters and shares still work when Blobs reads carry no ETag (netlify dev behaviour): ETag from list()');

s = fresh(); const n0 = upstream.length;
for (const b of [
  { messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] },
  { messages: [{ role: 'assistant', content: 'b' }] },
  { messages: [{ role: 'user', content: [{ type: 'document', source: {} }] }] },
  { messages: [{ role: 'user', content: [{ type: 'text', text: 'x'.repeat(40001) }] }] },
  { system: { a: 1 }, messages: [{ role: 'user', content: 'x' }] },
  { messages: [{ role: 'user', content: Array(7).fill(img) }] },
  { purpose: 7, messages: [{ role: 'user', content: 'x' }] },
  { purpose: 'x'.repeat(31), messages: [{ role: 'user', content: 'x' }] },
]) { r = await claude(b); assert.equal(r.status, 400, JSON.stringify(r)); }
r = await claude('not json'); assert.equal(r.status, 413);
r = await claude('{"messages":[{"role":"user","content":"' + 'x'.repeat(6 * 1024 * 1024) + '"}]}'); assert.equal(r.status, 413);
assert.equal(upstream.length, n0); assert.equal(s.usage.writes, 0, 'rejected requests must not use the allowance');
ok('request validation: one user turn, text/photo only, size limits, 6 MB body cap; rejects use no allowance');
for (const purpose of ['receipt', 'paste', 'recipes', 'steps', 'brand-new-feature', '']) { s = fresh(); r = await claude({ ...good, purpose }); assert.equal(r.status, 200, purpose); assert.ok(s.usage.peek(`day/${day()}/total`) === '1' && [...s.usage.m.keys()].some(k => k.includes('/user/')), purpose); assert.equal(r.headers.get('X-Quota-Left'), null); }
ok('purposes receipt/paste/recipes/steps (and unknown names) use the general 8/day allowance');
r = await claude({ max_tokens: 3000, messages: [{ role: 'user', content: [...Array(6).fill(img), { type: 'text', text: 'list' }] }] }); assert.equal(r.status, 200); assert.equal(upstream.at(-1).body.max_tokens, 3000);
ok('6 photos accepted, max_tokens under the cap passed through');

reply = () => new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'bad image' } }), { status: 400, headers: { 'content-type': 'application/json' } });
s = fresh(); r = await claude(good); assert.equal(r.status, 400); assert.equal(r.data.error, 'bad image');
reply = () => { throw new TypeError('fetch failed'); };
r = await claude(good, '7.7.7.7'); assert.equal(r.status, 502); assert.match(r.data.error, /Couldn’t reach the AI/);
reply = () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'hi' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
ok('Anthropic errors pass through with their status; network failures give 502');

s = fresh(); delete process.env.ANTHROPIC_API_KEY; r = await claude(good); assert.equal(r.status, 503);
ok('no AI key → 503, nothing counted');

/* ===== AI Gateway vs own key ===== */
s = fresh({ ANTHROPIC_BASE_URL: 'https://gateway.netlify.test/anthropic' });
r = await claude(good); assert.equal(r.status, 200); assert.match(upstream.at(-1).url, /^https:\/\/gateway\.netlify\.test\/anthropic\/v1\/messages/);
r = await call(F.health, '/api/health'); assert.equal(r.data.gateway, true); assert.equal(r.data.ai, true);
s = fresh(); r = await call(F.health, '/api/health'); assert.equal(r.data.gateway, false);
ok('new Anthropic() follows ANTHROPIC_BASE_URL (gateway) and health reports gateway true/false');

/* ===== Tiers: list ===== */
const list = (ip = '1.2.3.4', extra = {}) => claude({ purpose: 'list', max_tokens: 5000, messages: [{ role: 'user', content: [img, { type: 'text', text: 'read my list' }] }], ...extra }, ip);
s = fresh();
r = await list(); assert.equal(r.status, 200); assert.equal(upstream.at(-1).body.model, 'claude-haiku-5-5'); assert.equal(upstream.at(-1).body.max_tokens, 400);
assert.equal(r.headers.get('X-Quota-Left'), '9'); assert.equal(r.headers.get('X-Quota-Limit'), '10');
ok('purpose "list": cheapest model (claude-haiku-5-5), max_tokens capped at 400');
for (let i = 1; i < 10; i++) assert.equal((await list()).status, 200);
r = await list(); assert.equal(r.status, 429); assert.equal(r.data.code, 'list_limit'); assert.match(r.data.error, /month’s 10 free handwriting reads/); assert.equal(r.headers.get('X-Quota-Left'), '0');
assert.equal((await list('5.5.5.5')).status, 200);
assert.equal((await claude(good)).status, 200, 'list use does not eat the daily general allowance');
assert.ok(s.usage.peek(`month/${month()}/list/` + [...s.usage.m.keys()].find(k => k.startsWith(`month/${month()}/list/`)).split('/').pop()));
ok('list monthly cap: 10 per person per month (FREE_LIST_PER_MONTH, code list_limit, X-Quota-Left), separate from the 8/day');
s = fresh({ FREE_LIST_PER_MONTH: '2', LIST_MODEL: 'claude-list-test' }); assert.equal((await list()).status, 200); assert.equal(upstream.at(-1).body.model, 'claude-list-test'); assert.equal((await list()).status, 200); assert.equal((await list()).status, 429);
ok('FREE_LIST_PER_MONTH and LIST_MODEL env vars work');
s = fresh(); s.usage.put(`day/${day()}/list-total`, '100'); r = await list(); assert.equal(r.status, 429); assert.match(r.data.error, /list reading is at capacity/); assert.equal(r.data.code, 'free_limit');
s = fresh(); s.usage.put(`day/${day()}/total`, '300'); r = await list(); assert.equal(r.status, 429);
ok('list daily total (FREE_LIST_DAILY_TOTAL 100) and the shared 300/day cap both apply');
s = fresh(); r = await list('1.2.3.4', { messages: [{ role: 'user', content: [img, img, img] }] }); assert.equal(r.status, 400);
ok('list: at most 2 photos');

/* ===== Tiers: scan (Premium) ===== */
const scanReq = (token, ip = '1.2.3.4', bearer = false) => claude({ purpose: 'scan', max_tokens: 3000, messages: [{ role: 'user', content: [img, { type: 'text', text: 'what is in my fridge' }] }] }, ip, token ? (bearer ? { Authorization: 'Bearer ' + token } : { 'X-Premium': token }) : {});
s = fresh(); const u1 = upstream.length;
r = await scanReq(); assert.equal(r.status, 402); assert.equal(r.data.code, 'premium_required'); assert.equal(upstream.length, u1); assert.equal(s.usage.writes, 0);
ok('purpose "scan" without a Premium token → 402 premium_required, nothing counted');
r = await scanReq('garbage.sig'); assert.equal(r.status, 403); assert.equal(r.data.code, 'premium_invalid');
r = await scanReq('a.b.c'); assert.equal(r.status, 403); assert.equal(r.data.reason, 'malformed');
const forged = signPremium({ sub: 'mallory', days: 30 }, 'some-other-secret-0123456789-abcdefghij').token;
r = await scanReq(forged); assert.equal(r.status, 403); assert.equal(r.data.reason, 'signature');
const real = signPremium({ sub: 'wyatt', days: 30 }, SECRET).token;
const [p0, sig] = real.split('.'); const tampered = [Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p0, 'base64url')), exp: 9e9 })).toString('base64url'), sig].join('.');
r = await scanReq(tampered); assert.equal(r.status, 403); assert.equal(r.data.reason, 'signature');
ok('bad, forged and tampered Premium tokens → 403 premium_invalid');
const expired = signPremium({ sub: 'wyatt', days: 1 }, SECRET, Date.now() - 2 * 86400000).token;
r = await scanReq(expired); assert.equal(r.status, 403); assert.equal(r.data.reason, 'expired');
ok('expired Premium token → 403 (reason expired)');
const wpl = Buffer.from(JSON.stringify({ v: 1, sub: 'x', plan: 'free', iat: 1, exp: 9e9 })).toString('base64url');
const wrongPlan = `${wpl}.${createHmac('sha256', SECRET).update(wpl).digest('base64url')}`;
r = await scanReq(wrongPlan); assert.equal(r.status, 403); assert.equal(r.data.reason, 'plan');
ok('token for another plan → 403 (reason plan)');
r = await scanReq(real); assert.equal(r.status, 200); assert.equal(upstream.at(-1).body.model, 'claude-sonnet-5-5'); assert.equal(upstream.at(-1).body.max_tokens, 3000);
assert.equal(r.headers.get('X-Quota-Left'), '99'); assert.equal(r.headers.get('X-Quota-Limit'), '100');
assert.equal((await scanReq(real, '1.2.3.4', true)).status, 200);
assert.equal(s.usage.peek(`day/${day()}/total`), undefined, 'premium does not use the free daily total');
ok('valid Premium token (X-Premium or Bearer) → scan runs on MODEL, reports X-Quota-Left, skips the free caps');
s = fresh(); r = await claude({ ...good, purpose: 'recipes' }, '1.2.3.4', { 'X-Premium': real }); assert.equal(r.status, 200);
assert.equal(s.usage.peek(`day/${day()}/total`), '1'); assert.ok(![...s.usage.m.keys()].some(k => k.includes('/premium/')));
ok('X-Premium on other purposes: ignored (free caps apply, Premium counter untouched)');
s = fresh({ PREMIUM_PER_MONTH: '3' });
for (let i = 0; i < 3; i++) assert.equal((await scanReq(real, `8.8.8.${i}`)).status, 200);
r = await scanReq(real, '8.8.4.4'); assert.equal(r.status, 429); assert.equal(r.data.code, 'premium_limit'); assert.equal(r.headers.get('X-Quota-Left'), '0');
assert.equal((await scanReq(signPremium({ sub: 'someone-else' }, SECRET).token)).status, 200);
ok('Premium monthly cap per token holder (PREMIUM_PER_MONTH), across IPs');
s = fresh(); delete process.env.PREMIUM_SIGNING_SECRET; r = await scanReq(real); assert.equal(r.status, 402); assert.equal(r.data.reason, 'disabled');
s = fresh({ PREMIUM_SIGNING_SECRET: 'short' }); r = await scanReq(real); assert.equal(r.status, 402);
s = fresh({ PREMIUM_SIGNING_SECRET: 'x'.repeat(19) }); assert.equal((await scanReq(signPremium({ sub: 'b' }, 'x'.repeat(20)).token)).status, 402);
s = fresh({ PREMIUM_SIGNING_SECRET: 'abcdef-ghijkl-mnopqr' }); assert.equal((await scanReq(signPremium({ sub: 'b' }, 'abcdef-ghijkl-mnopqr').token)).status, 200, 'a 20-character phone-generated password works');
ok('Premium is off when PREMIUM_SIGNING_SECRET is unset or shorter than 20 characters');
assert.equal(verifyPremium(real, SECRET).sub, 'wyatt'); assert.equal(verifyPremium('', SECRET).reason, 'missing');
ok('verifyPremium() unit checks');

/* ===== Admin mint ===== */
s = fresh();
r = await call(F.mint, '/api/admin/mint', { sub: 'wyatt' }, '1.2.3.4', { Authorization: 'Bearer ' + ADMIN }); assert.equal(r.status, 404);
s = fresh({ ADMIN_TOKEN: 'too-short' });
r = await call(F.mint, '/api/admin/mint', { sub: 'wyatt' }, '1.2.3.4', { Authorization: 'Bearer too-short' }); assert.equal(r.status, 404);
ok('admin mint is OFF (404) when ADMIN_TOKEN is unset or under 20 characters');
s = fresh({ ADMIN_TOKEN: ADMIN });
r = await call(F.mint, '/api/admin/mint', { sub: 'wyatt' }, '1.2.3.4', { Authorization: 'Bearer wrong-wrong-wrong-wrong-wrong-wrong' }); assert.equal(r.status, 401);
r = await call(F.mint, '/api/admin/mint', undefined, '1.2.3.4', { Authorization: 'Bearer ' + ADMIN }); assert.equal(r.status, 405);
r = await call(F.mint, '/api/admin/mint', { sub: 'bad sub!' }, '1.2.3.4', { Authorization: 'Bearer ' + ADMIN }); assert.equal(r.status, 400);
r = await call(F.mint, '/api/admin/mint', { sub: 'wyatt-test', days: 7 }, '1.2.3.4', { Authorization: 'Bearer ' + ADMIN }); assert.equal(r.status, 201);
assert.match(r.data.token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/); assert.equal(r.data.plan, 'test');
const pl = JSON.parse(Buffer.from(r.data.token.split('.')[0], 'base64url')); assert.equal(pl.v, 1); assert.equal(pl.sub, 'wyatt-test'); assert.equal(pl.exp, r.data.exp); assert.ok(Math.abs(r.data.exp - (Date.now() / 1000 + 7 * 86400)) < 5);
assert.equal((await scanReq(r.data.token)).status, 200);
r = await call(F.mint, '/api/admin/mint', { sub: 'x', admin_token: ADMIN }); assert.equal(r.status, 201);
delete process.env.PREMIUM_SIGNING_SECRET; r = await call(F.mint, '/api/admin/mint', { sub: 'x' }, '1.2.3.4', { Authorization: 'Bearer ' + ADMIN }); assert.equal(r.status, 503);
ok('admin mint: wrong token 401, bad sub 400, minted token works for scan, needs the signing secret');

/* ===== Premium redeem ===== */
s = fresh(); const minted = signPremium({ sub: 'tester1', plan: 'test', days: 30 }, SECRET);
s.usage.put(`month/${month()}/premium/tester1`, '4');
r = await call(F.redeem, '/api/premium/redeem', { code: minted.token }); assert.equal(r.status, 200);
assert.equal(r.data.token, minted.token); assert.equal(r.data.exp, minted.exp); assert.equal(r.data.plan, 'test'); assert.deepEqual(r.data.quota, { left: 96, limit: 100 });
assert.equal((await call(F.redeem, '/api/premium/redeem', { code: 'nope.nope' })).status, 400);
assert.equal((await call(F.redeem, '/api/premium/redeem', { code: signPremium({ sub: 'old', days: 1 }, SECRET, Date.now() - 3 * 864e5).token })).status, 403);
assert.equal((await call(F.redeem, '/api/premium/redeem', {})).status, 400);
delete process.env.PREMIUM_SIGNING_SECRET; assert.equal((await call(F.redeem, '/api/premium/redeem', { code: minted.token })).status, 501);
ok('premium redeem: valid code → token, exp (seconds), plan, quota; bad 400, expired 403, Premium off 501');
s = fresh({ PREMIUM_TEST_CODES: 'owner-test-code-123, short, second-code-abcdef' });
r = await call(F.redeem, '/api/premium/redeem', { code: 'owner-test-code-123' }); assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.plan, 'test'); assert.ok(Math.abs(r.data.exp - (Date.now() / 1000 + 30 * 86400)) < 5); assert.deepEqual(r.data.quota, { left: 100, limit: 100 });
assert.ok(!r.data.token.includes('owner-test-code'), 'the code itself is not inside the token');
assert.equal((await scanReq(r.data.token)).status, 200);
const again = await call(F.redeem, '/api/premium/redeem', { code: 'owner-test-code-123' }); assert.equal(verifyPremium(again.data.token, SECRET).sub, verifyPremium(r.data.token, SECRET).sub);
assert.equal((await call(F.redeem, '/api/premium/redeem', { code: 'second-code-abcdef' })).status, 200);
assert.equal((await call(F.redeem, '/api/premium/redeem', { code: 'short' })).status, 400, 'codes under 12 characters are ignored');
assert.equal((await call(F.redeem, '/api/premium/redeem', { code: 'owner-test-code-12' })).status, 400);
s = fresh(); assert.equal((await call(F.redeem, '/api/premium/redeem', { code: 'owner-test-code-123' })).status, 400, 'no test codes when PREMIUM_TEST_CODES is unset');
ok('premium redeem: PREMIUM_TEST_CODES → 30-day "test" token (same tester = same counter); off when unset; short codes ignored');

/* ===== Community ===== */
s = fresh();
const rec = (t = 'Chili') => ({ title: t, ingredients: [{ qty: 2, unit: 'cup', name: 'rice' }, null, 5], steps: ['Cook it.'], author: '<img src=x onerror=alert(1)>' });
const share = (b, ip = '1.2.3.4') => call(F.community, '/api/community', b, ip);
for (let i = 0; i < 3; i++) { r = await share(rec()); assert.equal(r.status, 201, JSON.stringify(r)); }
r = await share(rec()); assert.equal(r.status, 429);
r = await share(rec(), '5.6.7.8'); assert.equal(r.status, 201);
r = await share({ ...rec(), steps: ['x'.repeat(70000)] }, '9.9.9.9'); assert.equal(r.status, 413);
r = await share({ ...rec(), steps: ['see http://spam'] }, '9.9.9.9'); assert.equal(r.status, 400);
s.usage.put(`day/${day()}/share-total`, '50');
r = await share(rec(), '8.8.8.8'); assert.equal(r.status, 429);
r = await call(F.community, '/api/community'); assert.equal(r.status, 200); assert.equal(r.data.recipes.length, 4); assert.equal(r.data.recipes[0].ingredients.length, 1);
ok('community: 3 shares per person per day, 50 per day total, size/link checks, junk ingredients dropped');
s = fresh();
const many = await Promise.all(Array.from({ length: 4 }, (_, i) => share(rec('R' + i), `20.0.0.${i}`)));
assert.ok(many.every(x => x.status === 201), many.map(x => x.status).join(','));
assert.equal((await call(F.community, '/api/community')).data.recipes.length, 4);
ok('4 shares at the same moment: none lost (compare-and-swap on the list)');
s = fresh({ COMMUNITY: 'off' }); assert.equal((await share(rec())).status, 501); assert.deepEqual((await call(F.community, '/api/community')).data, { recipes: [] });
r = await call(F.health, '/api/health'); assert.equal(r.data.community, false);
ok('COMMUNITY=off switches sharing off');

/* ===== Same-origin guard, CORS, APP_TOKEN ===== */
s = fresh();
r = await claude(good, '1.2.3.4', { Origin: 'https://evil.example' }); assert.equal(r.status, 403); assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
r = await claude(good, '1.2.3.4', { Origin: HOST }); assert.equal(r.status, 200); assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
ok('other websites are refused (403, no CORS); the app’s own origin works with no CORS headers');
s = fresh({ ALLOWED_ORIGIN: 'https://pp.com' });
r = await call(F.health, '/api/health', undefined, '1.1.1.1', { Origin: 'https://evil.com' }); assert.equal(r.status, 403); assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
r = await call(F.health, '/api/health', undefined, '1.1.1.1', { Origin: 'https://pp.com' }); assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://pp.com');
r = await call(F.claude, '/api/claude', undefined, '1.1.1.1', { Origin: 'https://pp.com' }, 'OPTIONS'); assert.equal(r.status, 204);
assert.match(r.headers.get('Access-Control-Allow-Headers'), /X-Premium/); assert.match(r.headers.get('Access-Control-Expose-Headers'), /X-Quota-Left, X-Quota-Limit/);
ok('ALLOWED_ORIGIN: listed extra origins get CORS (X-Premium allowed, X-Quota-* exposed), others don’t');
s = fresh({ APP_TOKEN: 'tok' });
assert.equal((await claude(good)).status, 401); assert.equal((await claude(good, '1.2.3.4', { 'X-App-Token': 'tok' })).status, 200);
assert.equal((await call(F.health, '/api/health')).status, 200);
ok('optional APP_TOKEN still works (health stays open)');

/* ===== Health, Amazon, recipes ===== */
s = fresh();
r = await call(F.health, '/api/health');
for (const k of ['ok', 'ai', 'gateway', 'premium', 'community', 'freeListPerMonth', 'freePerDay', 'amazon', 'online', 'model']) assert.ok(k in r.data, k);
assert.equal(r.data.freePerDay, 8); assert.equal(r.data.freeListPerMonth, 10); assert.equal(r.data.premium, true); assert.equal(r.data.model, 'claude-sonnet-5-5');
assert.ok(!JSON.stringify(r.data).includes('sk-test') && !JSON.stringify(r.data).includes(SECRET));
ok('health: ai, gateway, premium, community, freeListPerMonth (+ the old fields), no secrets');
assert.equal((await call(F.amazon, '/api/amazon/search')).status, 400);
assert.equal((await call(F.amazon, '/api/amazon/search?q=rice')).status, 501);
ok('amazon search: 400 without q, 501 placeholder until the Creators API is set up');
assert.equal((await call(F.recipes, '/api/recipes/search?ingredients=rice')).status, 501);
s = fresh({ SPOONACULAR_KEY: 'spoon' });
reply = () => new Response(JSON.stringify({ results: [{ id: 1, title: 'Rice', cuisines: ['Asian'], readyInMinutes: 20, servings: 2, nutrition: { nutrients: [{ name: 'Calories', amount: 300.4 }] }, extendedIngredients: [{ amount: 1, unit: 'Cup', nameClean: 'rice' }], analyzedInstructions: [{ steps: [{ step: 'Cook.' }] }], sourceName: 'Src', sourceUrl: 'https://src' }] }), { status: 200 });
r = await call(F.recipes, '/api/recipes/search?ingredients=rice&intolerances=egg,junk&diets=Vegan&meal=Dinner');
assert.equal(r.status, 200); assert.equal(r.data.recipes[0].calories, 300); assert.equal(r.data.recipes[0].sourceUrl, 'https://src');
const su = new URL(upstream.at(-1).url); assert.equal(su.searchParams.get('intolerances'), 'Egg'); assert.equal(su.searchParams.get('diet'), 'vegan'); assert.equal(su.searchParams.get('type'), 'main course');
reply = () => new Response('{}', { status: 402 }); assert.equal((await call(F.recipes, '/api/recipes/search?ingredients=rice')).status, 429);
ok('recipe search: off without SPOONACULAR_KEY, maps filters, keeps source credit, 402 → 429');

/* ===== Cleanup + config ===== */
s = fresh();
const now = new Date('2026-10-22T00:30:00Z');
for (const k of ['day/2026-10-20/total', 'day/2026-10-20/user/a', 'day/2026-10-21/total', 'day/2026-10-22/user/b', 'month/2026-08/list/a', 'month/2026-09/list/a', 'month/2026-10/premium/w', 'other']) s.usage.put(k, '1');
r = await cleanupUsage(s.usage, now);
assert.deepEqual([...s.usage.m.keys()].sort(), ['day/2026-10-21/total', 'day/2026-10-22/user/b', 'month/2026-09/list/a', 'month/2026-10/premium/w', 'other']); assert.equal(r.deleted, 3);
ok('cleanup deletes counters older than yesterday / last month (UTC) and nothing else');

const cfg = Object.fromEntries(Object.entries(F).map(([k, m]) => [k, m.config]));
assert.equal(cfg.redeem.path, '/api/premium/redeem');
assert.equal(cfg.claude.path, '/api/claude'); assert.equal(cfg.community.path, '/api/community'); assert.equal(cfg.health.path, '/api/health');
assert.equal(cfg.amazon.path, '/api/amazon/search'); assert.equal(cfg.recipes.path, '/api/recipes/search'); assert.equal(cfg.mint.path, '/api/admin/mint');
for (const k of ['claude', 'community', 'mint', 'redeem']) { const rl = cfg[k].rateLimit; assert.ok(rl.windowLimit > 0 && rl.windowSize > 0 && rl.aggregateBy.includes('ip') && rl.aggregateBy.includes('domain'), k); }
assert.match(cfg.cleanup.schedule, /^\d+ \d+ \* \* \*$/); assert.equal(cfg.cleanup.path, undefined);
for (const st of blobs.stores.values()) assert.equal(st.consistency, 'strong', st.name);
ok('function config: /api paths, rate limits on claude/community/mint/redeem, nightly UTC schedule, strong-consistency stores');

{ // paste-test and scan-cost-test pull the validator out of the rules file as text; make sure that still works.
  const src = fs.readFileSync(new URL('../netlify/lib/claude-rules.mjs', import.meta.url), 'utf8');
  const m = src.match(/const MAX_IMAGES = (\d+)/), mp = src.match(/const MAX_PROMPT_CHARS = ([\d_]+)/);
  const v = new Function('MAX_IMAGES', 'MAX_PROMPT_CHARS', src.match(/function validateClaudeBody[\s\S]*?\n}\n/)[0] + 'return validateClaudeBody;')(Number(m[1]), Number(mp[1].replace(/_/g, '')));
  assert.equal(v(good), null); assert.equal(v({ messages: [] }), 'Send exactly one message.');
  ok('the browser suites can still extract validateClaudeBody from netlify/lib/claude-rules.mjs');
}
console.log(`functions tests passed (${n} checks)`);
