// service-worker.js
// STracker PWA — offline cache
// Zmień CACHE_VERSION przy każdym deployu żeby wymusić odświeżenie cache
const CACHE_VERSION = 'stracker-v2.2.8';
const CACHE_NAME = CACHE_VERSION;

const PRECACHE_URLS = [
  '/STracker/',
  '/STracker/index.html',
  '/STracker/manifest.json',
  '/STracker/version.json',
  '/STracker/icons/icon-192_v2.png',
  '/STracker/icons/icon-512_v2.png',
  '/STracker/data/config.json',
  '/STracker/data/harmonogram.json',
  '/STracker/data/waga.json',
  '/STracker/data/cykl1/treningi.json',
  '/STracker/data/cykl1/plan.json',
  '/STracker/data/cykl1/progresja.json',
  '/STracker/data/cykl1/dieta.json',
  '/STracker/data/cykl2/treningi.json',
  '/STracker/data/cykl2/plan.json',
  '/STracker/data/cykl2/progresja.json',
  '/STracker/data/cykl2/dieta.json',
];

const CDN_CACHE_NAME = 'stracker-cdn-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== CDN_CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  const isCDN = (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('unpkg.com')
  );
  if (isCDN) { event.respondWith(staleWhileRevalidate(request, CDN_CACHE_NAME)); return; }
  event.respondWith(cacheFirst(request, CACHE_NAME));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    if (request.mode === 'navigate') {
      const cache = await caches.open(cacheName);
      return cache.match('/STracker/') || cache.match('/STracker/index.html');
    }
    return new Response('Brak połączenia', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);
  return cached || fetchPromise;
}