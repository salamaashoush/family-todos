// Service Worker for Family Todos PWA
// Version is used to bust cache on updates - increment this when deploying new versions
const SW_VERSION = '1.0.0';
const CACHE_NAME = `family-todos-${SW_VERSION}`;

// Only cache truly static assets that rarely change
const STATIC_ASSETS = [
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// Install event - cache static assets only
self.addEventListener('install', (event) => {
  console.log(`[SW ${SW_VERSION}] Installing...`);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`[SW ${SW_VERSION}] Caching static assets`);
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force activation - don't wait for old SW to release
        console.log(`[SW ${SW_VERSION}] Skip waiting`);
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error(`[SW ${SW_VERSION}] Install failed:`, err);
      })
  );
});

// Activate event - clean up ALL old caches
self.addEventListener('activate', (event) => {
  console.log(`[SW ${SW_VERSION}] Activating...`);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete any cache that isn't the current version
            if (cacheName !== CACHE_NAME) {
              console.log(`[SW ${SW_VERSION}] Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        console.log(`[SW ${SW_VERSION}] Claiming clients`);
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients about the update
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
          });
        });
      })
  );
});

// Fetch event - Network first, with offline fallback for navigation only
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-http(s) requests (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip API requests - always go to network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_server/')) {
    return;
  }

  // Skip WebSocket and SSE connections
  if (request.headers.get('accept')?.includes('text/event-stream')) {
    return;
  }

  // Skip hot module replacement in development
  if (url.pathname.includes('__vite') || url.pathname.includes('.hot-update.')) {
    return;
  }

  // For navigation requests - network first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Only show offline page when network fails
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // For static assets (icons, etc.) - cache first, network fallback
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset.replace('/', '')))) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request);
        })
    );
    return;
  }

  // Everything else - network only (no caching of JS/CSS to avoid stale code)
  // This ensures users always get the latest version
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  const { type } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      // Force this SW to activate immediately
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      // Return current SW version
      event.ports[0]?.postMessage({ version: SW_VERSION });
      break;

    case 'CLEAR_CACHE':
      // Allow app to force cache clear
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        event.ports[0]?.postMessage({ success: true });
      });
      break;
  }
});

// Handle errors
self.addEventListener('error', (event) => {
  console.error(`[SW ${SW_VERSION}] Error:`, event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error(`[SW ${SW_VERSION}] Unhandled rejection:`, event.reason);
});
