// Stand-in for @anthropic-ai/sdk (MOCK), used only when node_modules is missing. Makes the same HTTP call
// as the real SDK (POST {baseURL}/v1/messages with x-api-key) and throws errors shaped like the SDK's.
export class APIError extends Error { constructor(status, error, message) { super(message); this.status = status; this.error = error; } }
export class APIConnectionError extends Error { constructor(message = 'Connection error.') { super(message); } }
export class APIConnectionTimeoutError extends APIConnectionError { constructor() { super('Request timed out.'); } }
export default class Anthropic {
  constructor(opts = {}) {
    this.apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY ?? null;
    this.baseURL = (opts.baseURL ?? process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com').replace(/\/+$/, '');
    this.timeout = opts.timeout ?? 600000;
    this.messages = { create: async body => {
      let res;
      try { res = await fetch(this.baseURL + '/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(body), signal: AbortSignal.timeout(this.timeout) }); }
      catch (e) { if (e.name === 'TimeoutError' || e.name === 'AbortError') throw new APIConnectionTimeoutError(); throw new APIConnectionError(); }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new APIError(res.status, data, data?.error?.message || String(res.status));
      return data;
    } };
  }
}
Object.assign(Anthropic, { APIError, APIConnectionError, APIConnectionTimeoutError });
