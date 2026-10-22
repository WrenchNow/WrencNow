#!/usr/bin/env node
/**
 * Finds (or, if asked, creates) the Pantry Pal project on Netlify, for the deploy workflow.
 * It never changes an existing project. It only reads one, or creates a new empty one.
 *
 * Env:
 *   NETLIFY_AUTH_TOKEN  required (personal access token)
 *   NETLIFY_SITE_ID     use this project (preferred once known)
 *   NETLIFY_SITE_NAME   or: find the project with exactly this name, creating it if it doesn't exist
 *   NETLIFY_API         API base, default https://api.netlify.com/api/v1 (overridden only in tests)
 *
 * SAFETY GUARD: refuses (exit 1) unless the project's name contains "pantry", and refuses any
 * project whose name or domains mention "wrench", so a wrong ID can never overwrite getwrenchnow.com
 * or Wyatt's other projects.
 *
 * Writes to $GITHUB_OUTPUT: ready=true|false, site_id, site_name, site_url, origins (comma-separated https origins).
 */
import { appendFileSync } from 'node:fs';

const API = (process.env.NETLIFY_API || 'https://api.netlify.com/api/v1').replace(/\/+$/, '');
const TOKEN = process.env.NETLIFY_AUTH_TOKEN || '';
const ID = (process.env.NETLIFY_SITE_ID || '').trim();
const NAME = (process.env.NETLIFY_SITE_NAME || '').trim().toLowerCase();

const out = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); console.log(`  ${k}=${v}`); };
const stop = msg => { console.log(`::error::${msg}`); process.exit(1); };
const skip = msg => { console.log(`::notice::${msg}`); out('ready', 'false'); process.exit(0); };

async function api(method, path, body) {
  const res = await fetch(API + path, {
    method, signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'pantry-pal-deploy' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { }
  return { status: res.status, json, text };
}

function guard(site) {
  const domains = [site.name, site.url, site.ssl_url, site.custom_domain, ...(site.domain_aliases || [])].filter(Boolean);
  if (domains.some(d => /wrench/i.test(d))) stop(`Refusing to deploy: Netlify project "${site.name}" looks like a WrenchNow project (${domains.join(', ')}). Fix NETLIFY_SITE_ID.`);
  if (!/pantry/i.test(site.name || '')) stop(`Refusing to deploy: Netlify project "${site.name}" doesn't have "pantry" in its name, so it may be one of your other projects. Fix NETLIFY_SITE_ID or rename the Pantry Pal project.`);
}

async function main() {
  if (!TOKEN) skip('NETLIFY_AUTH_TOKEN is not set. Skipping Netlify.');
  let site;
  if (ID) {
    const r = await api('GET', `/sites/${encodeURIComponent(ID)}`);
    if (r.status === 401) stop('Netlify rejected NETLIFY_AUTH_TOKEN (401). Make a new token and update the GitHub secret.');
    if (r.status === 404) stop(`No Netlify project with ID ${ID} (404). Copy the Project ID again from Netlify → Project configuration.`);
    if (r.status !== 200 || !r.json) stop(`Netlify API error ${r.status}: ${r.text.slice(0, 200)}`);
    site = r.json;
  } else if (NAME) {
    if (!/^[a-z0-9-]{3,63}$/.test(NAME) || !NAME.includes('pantry')) stop(`NETLIFY_SITE_NAME "${NAME}" must use only a-z, 0-9 and dashes, and contain "pantry" (e.g. pantry-pal-wyatt).`);
    const r = await api('GET', `/sites?name=${encodeURIComponent(NAME)}&filter=all&per_page=100`);
    if (r.status === 401) stop('Netlify rejected NETLIFY_AUTH_TOKEN (401). Make a new token and update the GitHub secret.');
    if (r.status !== 200 || !Array.isArray(r.json)) stop(`Netlify API error ${r.status}: ${r.text.slice(0, 200)}`);
    site = r.json.find(s => s.name === NAME);
    if (site) console.log(`Found your Netlify project "${NAME}".`);
    else {
      const c = await api('POST', '/sites', { name: NAME });
      if (c.status === 422) stop(`The Netlify name "${NAME}" is taken by someone else. Pick another NETLIFY_SITE_NAME (e.g. add your initials).`);
      if ((c.status !== 200 && c.status !== 201) || !c.json) stop(`Couldn't create the Netlify project (${c.status}): ${c.text.slice(0, 200)}`);
      site = c.json;
      console.log(`Created a new, empty Netlify project "${NAME}". Your other projects were not touched.`);
    }
  } else skip('Neither NETLIFY_SITE_ID (secret) nor NETLIFY_SITE_NAME (variable) is set. Skipping Netlify.');

  guard(site);
  const origins = [...new Set([site.ssl_url, site.url, site.custom_domain && `https://${site.custom_domain}`, ...(site.domain_aliases || []).map(d => `https://${d}`)]
    .filter(Boolean).map(u => { try { return new URL(u.replace(/^http:/, 'https:')).origin; } catch { return null; } }).filter(Boolean))];
  const siteUrl = site.custom_domain ? `https://${site.custom_domain}` : (site.ssl_url || site.url || '').replace(/^http:/, 'https:');
  console.log(`Netlify project: ${site.name} → ${siteUrl}`);
  out('ready', 'true');
  out('site_id', site.id || site.site_id);
  out('site_name', site.name);
  out('site_url', siteUrl.replace(/\/+$/, ''));
  out('origins', origins.join(','));
}
main().catch(e => stop(`Netlify lookup failed: ${e.message}`));
