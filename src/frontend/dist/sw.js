const CACHE_NAME = 'btc-lab-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/assets/generated/btc-icon-192.dim_192x192.png',
  '/assets/generated/btc-icon-512.dim_512x512.png',
  '/assets/fonts/BricolageGrotesque.woff2',
  '/assets/fonts/PlusJakartaSans.woff2',
  '/assets/fonts/JetBrainsMono.woff2',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).catch(() => {})
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API/ICP calls, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always go network for API/canister calls
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('binance.com') ||
    url.hostname.includes('cryptocompare.com') ||
    url.hostname.includes('internetcomputer.org')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for static assets (fonts, images, js, css)
  if (
    url.pathname.match(/\.(woff2|woff|png|jpg|svg|ico|js|css)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network-first for HTML (SPA shell)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match('/') || caches.match(event.request))
  );
});
