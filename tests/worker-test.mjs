// Runs against the real Worker source (pantry-pal-worker/src/index.js) with in-memory KV and a fake Anthropic API.
import worker from '../pantry-pal-worker/src/index.js';
import assert from 'node:assert/strict';
class KV { constructor(){ this.m=new Map(); this.writes=0; this.failPut=null; }
  async get(k,t){ const v=this.m.get(k); if(v==null) return null; return t==='json'?JSON.parse(v):v; }
  async put(k,v){ if(this.failPut && this.failPut(k)) throw new Error('KV put() limit exceeded'); this.writes++; this.m.set(k,v); } }
let upstream=[];
globalThis.fetch = async (url, init) => { upstream.push({url, body: JSON.parse(init.body)}); return new Response(JSON.stringify({content:[{type:'text',text:'hi'}]}),{status:200}); };
const env = () => ({ ANTHROPIC_API_KEY:'sk-test', USAGE:new KV(), COMMUNITY:new KV() });
const req = (path, body, ip='1.2.3.4', extra={}) => new Request('https://w.dev'+path, { method: body===undefined?'GET':'POST', headers: { 'CF-Connecting-IP': ip, 'Content-Type':'application/json', ...extra }, body: body===undefined?undefined:(typeof body==='string'?body:JSON.stringify(body)) });
const call = async (e, ...a) => { const r = await worker.fetch(req(...a), e); return { status: r.status, data: await r.json() }; };
const good = { system:'sys', max_tokens: 999999, model:'claude-opus-expensive', messages:[{role:'user', content:[{type:'text',text:'hello'}]}] };

let e = env(), r;
// model pinned, max_tokens capped, extra fields dropped
r = await call(e,'/api/claude', good); assert.equal(r.status,200);
assert.equal(upstream.at(-1).body.model,'claude-sonnet-5-5'); assert.equal(upstream.at(-1).body.max_tokens,4096); assert.deepEqual(Object.keys(upstream.at(-1).body).sort(),['max_tokens','messages','model','system']);
// per-user cap 8
for (let i=1;i<8;i++) assert.equal((await call(e,'/api/claude',good)).status,200);
r = await call(e,'/api/claude',good); assert.equal(r.status,429); assert.equal(r.data.code,'free_limit');
// IPv6 rotation within one /64 counts as one person
e = env();
for (let i=0;i<8;i++) assert.equal((await call(e,'/api/claude',good,`2001:db8:aa:bb::${i+1}`)).status,200);
assert.equal((await call(e,'/api/claude',good,'2001:0db8:00aa:00bb:1234:5678:9abc:def0')).status,429);
assert.equal((await call(e,'/api/claude',good,'2001:db8:aa:cc::1')).status,200);
// total cap 300
e = env(); e.USAGE.m.set(`t:${new Date().toISOString().slice(0,10)}`,'300');
assert.equal((await call(e,'/api/claude',good)).status,429);
// fail closed when total counter can't be written
e = env(); e.USAGE.failPut = k => k.startsWith('t:');
r = await call(e,'/api/claude',good); assert.equal(r.status,429); assert.match(r.data.error,/busy/);
// validation
e = env(); const n0 = upstream.length;
for (const b of [
  { messages:[{role:'user',content:'a'},{role:'assistant',content:'b'}] },
  { messages:[{role:'assistant',content:'b'}] },
  { messages:[{role:'user',content:[{type:'document',source:{}}]}] },
  { messages:[{role:'user',content:[{type:'text',text:'x'.repeat(40001)}]}] },
  { system:{a:1}, messages:[{role:'user',content:'x'}] },
  { messages:[{role:'user',content:Array(7).fill({type:'image',source:{type:'base64',media_type:'image/jpeg',data:'AA'}})}] },
]) { r = await call(e,'/api/claude',b); assert.equal(r.status,400, JSON.stringify(r)); }
r = await call(e,'/api/claude','not json'); assert.equal(r.status,413);
r = await call(e,'/api/claude','{"messages":[{"role":"user","content":"' + 'x'.repeat(12*1024*1024) + '"}]}'); assert.equal(r.status,413);
assert.equal(upstream.length,n0); assert.equal(e.USAGE.writes,0, 'rejected requests must not use the allowance');
// 6 images OK
r = await call(e,'/api/claude',{ max_tokens:3000, messages:[{role:'user',content:[...Array(6).fill({type:'image',source:{type:'base64',media_type:'image/jpeg',data:'AA'}}),{type:'text',text:'list'}]}] }); assert.equal(r.status,200);
// community
e = env();
const rec = (t='Chili') => ({ title:t, ingredients:[{qty:2,unit:'cup',name:'rice'}, null, 5], steps:['Cook it.'], author:'<img src=x onerror=alert(1)>' });
for (let i=0;i<3;i++) { r = await call(e,'/api/community',rec()); assert.equal(r.status,201, JSON.stringify(r)); }
r = await call(e,'/api/community',rec()); assert.equal(r.status,429);
r = await call(e,'/api/community',rec(),'5.6.7.8'); assert.equal(r.status,201);
r = await call(e,'/api/community',{...rec(), steps:['x'.repeat(70000)]},'9.9.9.9'); assert.equal(r.status,413);
r = await call(e,'/api/community',{...rec(), steps:['see http://spam']},'9.9.9.9'); assert.equal(r.status,400);
e.USAGE.m.set(`ct:${new Date().toISOString().slice(0,10)}`,'50');
r = await call(e,'/api/community',rec(),'8.8.8.8'); assert.equal(r.status,429);
r = await call(e,'/api/community'); assert.equal(r.status,200); assert.equal(r.data.recipes.length,4); assert.equal(r.data.recipes[0].ingredients.length,1);
// health + CORS
r = await worker.fetch(req('/api/health',undefined,'1.1.1.1',{Origin:'https://evil.com'}), {...env(), ALLOWED_ORIGIN:'https://pp.com'}); assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://pp.com');
console.log('worker tests passed');
