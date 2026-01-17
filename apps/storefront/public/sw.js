/**
 * Service Worker for Dear Margeaux Storefront
 *
 * Implements a cache-first strategy for static assets
 * and a network-first strategy for API calls
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `dear-margeaux-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dear-margeaux-dynamic-${CACHE_VERSION}`;

// Static assets to pre-cache
const STATIC_ASSETS = ['/favicon.svg', '/fonts/inter-var.woff2'];

// File types to cache
const CACHEABLE_TYPES = [
  '.js',
  '.css',
  '.woff',
  '.woff2',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.svg',
  '.ico',
];

// Install event - pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS.filter((url) => url));
      })
      .catch(() => {
        // Failed to cache some assets, continue anyway
      })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API calls and external requests - use network only
  if (
    url.pathname.startsWith('/v1/') ||
    url.pathname.startsWith('/api/') ||
    !url.origin.includes(self.location.origin)
  ) {
    return;
  }

  // For static assets, use cache-first strategy
  const isStaticAsset = CACHEABLE_TYPES.some((type) =>
    url.pathname.endsWith(type)
  );

  if (isStaticAsset || url.pathname.startsWith('/_astro/')) {
    event.respondWith(cacheFirst(request));
  } else {
    // For HTML pages, use stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request));
  }
});

/**
 * Cache-first strategy
 * Returns cached response if available, otherwise fetches from network
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed and no cache, return offline fallback
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale-while-revalidate strategy
 * Returns cached response immediately while fetching update
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(DYNAMIC_CACHE);
        cache.then((c) => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => cached || new Response('Offline', { status: 503 }));

  return cached || fetchPromise;
}
