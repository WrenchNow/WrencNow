// In-memory stand-in for @netlify/blobs (MOCK). Same method names and conditional-write rules as the
// real package (set with onlyIfNew / onlyIfMatch returns { modified, etag }), plus test hooks.
let seq = 0;
export const stores = new Map();
export class MockStore {
  constructor(name, consistency) { this.name = name; this.consistency = consistency; this.m = new Map(); this.writes = 0; this.failSet = null; this.failGet = null; this.noEtagOnRead = false; }
  #val(e, type) { return type === 'json' ? JSON.parse(e.data) : e.data; }
  async get(key, opts = {}) { await null; if (this.failGet && this.failGet(key)) throw new Error('Blobs read failed'); const e = this.m.get(key); return e ? this.#val(e, opts.type) : null; }
  async getWithMetadata(key, opts = {}) { await null; if (this.failGet && this.failGet(key)) throw new Error('Blobs read failed'); const e = this.m.get(key); return e ? { data: this.#val(e, opts.type), ...(this.noEtagOnRead ? {} : { etag: e.etag }), metadata: {} } : null; }
  async set(key, value, opts = {}) {
    await null;
    if (this.failSet && this.failSet(key)) throw new Error('Blobs write failed');
    const cur = this.m.get(key);
    if (opts.onlyIfNew && cur) return { modified: false };
    if (opts.onlyIfMatch !== undefined && (!cur || cur.etag !== opts.onlyIfMatch)) return { modified: false };
    const etag = `"${++seq}"`; this.m.set(key, { data: String(value), etag }); this.writes++;
    return { modified: true, etag };
  }
  async setJSON(key, value, opts) { return this.set(key, JSON.stringify(value), opts); }
  async delete(key) { await null; this.m.delete(key); }
  async list({ prefix = '' } = {}) { await null; return { blobs: [...this.m.entries()].filter(([k]) => k.startsWith(prefix)).map(([key, e]) => ({ key, etag: e.etag })), directories: [] }; }
  // noEtagOnRead: behave like netlify dev's local Blobs server, whose reads carry no ETag (list() still does).
  // test helpers
  peek(key) { const e = this.m.get(key); return e ? e.data : undefined; }
  put(key, value) { this.m.set(key, { data: String(value), etag: `"${++seq}"` }); }
}
export function getStore(opts) {
  const name = typeof opts === 'string' ? opts : opts.name;
  if (!stores.has(name)) stores.set(name, new MockStore(name, typeof opts === 'string' ? 'eventual' : opts.consistency || 'eventual'));
  return stores.get(name);
}
export const getDeployStore = () => { throw new Error('not used'); };
export function __reset() { stores.clear(); }
