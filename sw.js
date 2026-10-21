// Optional: put next to pantry-pal.html for offline support.
const CACHE = 'pantry-pal-v1';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.add('./').catch(() => {}))); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then(r => { if (u.origin === location.origin) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request)));
});
