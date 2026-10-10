// Aiced Strategy offline support: newest version when online, saved copy when offline
const CACHE = 'ice-48.3';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.searchParams.has('upd')) return;      // update checks always go to the network, never to a saved copy
  if (req.mode === 'navigate') {
    const game = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
    e.respondWith(fetch(req).then(r => {
      if (game && r.ok && r.type === 'basic') {                                     // only a good copy of the game becomes the offline copy (never a 404 or error page)
        const a = r.clone(), b = r.clone();
        e.waitUntil(caches.open(CACHE).then(c => Promise.all([c.put('./index.html', a), c.put('./', b)])));
      }
      return r;
    }).catch(() => caches.match('./index.html').then(h => h || caches.match('./'))));
    return;
  }
  if (url.origin === location.origin && url.pathname.endsWith('.webmanifest')) {     // the manifest is always the newest one when online
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; }).catch(() => caches.match(req)));
    return;
  }
  const fonts = /(^|\.)(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !fonts) return;
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
