const CACHE = 'tripsy-v1';

// Files to pre-cache on install
const PRECACHE = [
  './',
  './index.html',
];

// ── Install: pre-cache the shell ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate: delete old cache versions ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: stale-while-revalidate for same-origin,
//           network-first with cache fallback for external (fonts etc.) ──
self.addEventListener('fetch', e => {
  // Only handle GET
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const samOrigin = url.origin === self.location.origin;

  if (samOrigin) {
    // Stale-while-revalidate: serve cached immediately, refresh in background
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fresh = fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          });
          return cached || fresh;
        })
      )
    );
  } else {
    // External (Google Fonts etc.): network first, fall back to cache
    e.respondWith(
      caches.open(CACHE).then(cache =>
        fetch(e.request)
          .then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          })
          .catch(() => cache.match(e.request))
      )
    );
  }
});
