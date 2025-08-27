const CACHE_NAME = 'airfit-cache-v1';
const OFFLINE_URLS = [
  './',
  './index.html',
  './icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Navigation requests: network-first with offline fallback to cached index
async function handleNavigation(event) {
  try {
    const res = await fetch(event.request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(event.request, res.clone());
    return res;
  } catch (err) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match('./index.html');
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// Static assets: cache-first
async function handleAsset(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(event.request);
  if (cached) return cached;
  const res = await fetch(event.request);
  cache.put(event.request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle scope requests
  if (!url.pathname.startsWith(self.registration.scope.replace(location.origin, ''))) return;

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (req.method === 'GET') {
    event.respondWith(handleAsset(event));
  }
});

