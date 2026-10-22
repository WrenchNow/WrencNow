/**
 * GET /api/amazon/search?q=: top 3 Amazon products for the product picker. PLACEHOLDER.
 *
 * Amazon retired PA-API 5.0 in 2026 and points developers to the Creators API. Access requires an
 * approved Associates account. Until AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET and AMAZON_PARTNER_TAG are
 * set, this returns 501 and the app falls back to tagged Amazon search links automatically.
 *
 * TO FINISH (amazon + integrations agents): fill in searchAmazon() from Amazon's current Creators API
 * docs (auth flow + "search items" endpoint). Keep the return shape and the app needs no changes.
 * Cache results (e.g. Blobs store "amazon-cache", key = lower-cased query, 6 h) to stay within Amazon's limits.
 */
import { env, json, route } from '../lib/http.mjs';

const configured = () => !!(env('AMAZON_CLIENT_ID') && env('AMAZON_CLIENT_SECRET') && env('AMAZON_PARTNER_TAG'));

export default route(async req => {
  if (req.method !== 'GET') return json({ error: 'Use GET.' }, 405);
  const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 80);
  if (!q) return json({ error: 'q is required' }, 400);
  if (!configured()) return json({ error: 'Amazon product search is not configured.' }, 501);
  const items = await searchAmazon(q);
  return json({ items: items.slice(0, 3) });
});

/** @returns {Promise<Array<{asin:string,title:string,image?:string,price?:string}>>} */
async function searchAmazon(query) {
  void query;
  throw new Error('searchAmazon() is not implemented yet. See the comment at the top of netlify/functions/amazon-search.mjs.');
}

export const config = { path: '/api/amazon/search' };
