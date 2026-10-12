// WrenchNow service worker: makes the site installable and opens instantly.
// Pages always come from the network when online (so updates show right away);
// the saved copy is only used when there's no connection. Database and payment
// traffic is never cached.
const CACHE = 'wrenchnow-v18k';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // page loads: network first, fall back to the saved copy offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('/index.html', copy)); return res; })
      .catch(() => caches.match('/index.html')));
    return;
  }
  // our own icons/manifest, fonts and icon font: cache first
  const cacheable = url.origin === self.location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === 'cdn.jsdelivr.net';
  if (!cacheable) return;
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
