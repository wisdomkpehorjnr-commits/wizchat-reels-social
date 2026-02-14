/**
 * Service Worker - True offline-first caching strategy
 * Implements app shell pattern, background sync, and instant loading
 * 
 * Strategy:
 * - HTML pages: Network-first with 5s timeout, fallback to cache
 * - Static assets (JS, CSS): Cache-first for instant loading
 * - Images: Cache-first, fallback to network
 * - API: Network-first, fallback to cache
 * - Offline fallback: Redirect to root (/) to let React app handle routing
 */

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v1';
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Critical assets to precache for instant app shell loading
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - precache critical assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(ASSET_CACHE);
        
        // Precache critical assets for app shell
        await cache.addAll(CRITICAL_ASSETS);
        
        console.log('[ServiceWorker] Critical assets cached');
        
        // Skip waiting to activate immediately
        await self.skipWaiting();
      } catch (error) {
        console.error('[ServiceWorker] Install failed:', error);
      }
    })()
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        
        // Delete old cache versions
        await Promise.all(
          cacheNames
            .filter(name => !name.startsWith(CACHE_VERSION))
            .map(name => caches.delete(name))
        );
        
        console.log('[ServiceWorker] Old caches cleaned');
        
        // Claim all clients
        await self.clients.claim();
      } catch (error) {
        console.error('[ServiceWorker] Activation failed:', error);
      }
    })()
  );
});

// Fetch event - intelligent routing for offline support
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests - network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
  }
  // Image requests - cache first, fallback to network
  else if (isImageRequest(request)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
  }
  // Static assets (JS, CSS, fonts) - cache first
  else if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request, ASSET_CACHE));
  }
  // HTML pages - network first with timeout, offline fallback to redirect
  else if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategyWithTimeout(request, ASSET_CACHE));
  }
});

/**
 * Network first strategy with timeout for HTML pages
 * Try network for 5 seconds, fallback to cache, then return redirect to root
 */
async function networkFirstStrategyWithTimeout(
  request: Request,
  cacheName: string
): Promise<Response> {
  try {
    // Create a timeout promise that rejects after 5 seconds
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('Network timeout')), 5000);
    });

    // Race between network fetch and timeout
    const response = await Promise.race([
      fetch(request),
      timeoutPromise,
    ]);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed or timed out - try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Nothing in cache - redirect to root (let React app handle routing)
    return offlinePageResponse();
  }
}

/**
 * Network first strategy (for API requests, no timeout)
 */
async function networkFirstStrategy(
  request: Request,
  cacheName: string
): Promise<Response> {
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Fall back to cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline error response
    return new Response(
      JSON.stringify({ error: 'Offline - no cached data available' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Cache first strategy (for static assets)
 * Use cache if available, fetch from network if not cached
 */
async function cacheFirstStrategy(
  request: Request,
  cacheName: string
): Promise<Response> {
  try {
    // Check cache first
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Fetch from network
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Return placeholder for images
    if (isImageRequest(request)) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f0f0f0" width="100" height="100"/></svg>',
        {
          headers: { 'Content-Type': 'image/svg+xml' },
          status: 200,
        }
      );
    }

    // Return error response
    return new Response('Asset not available offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Generate offline page response - redirect to root
 * React app will serve cached HTML and handle routing client-side
 */
function offlinePageResponse(): Response {
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Loading...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #fff;
    }
    #root {
      width: 100%;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // Redirect to root so React app handles routing
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  </script>
</body>
</html>`,
    {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

/**
 * Detect if request is for an image
 */
function isImageRequest(request: Request): boolean {
  const accept = request.headers.get('accept') || '';
  return accept.includes('image');
}

/**
 * Detect if request is for a static asset
 * Includes JS, CSS, fonts, JSON, XML, etc.
 */
function isStaticAsset(request: Request): boolean {
  const url = new URL(request.url);
  const pathname = url.pathname.toLowerCase();
  return /\.(js|css|woff|woff2|ttf|eot|svg|json|xml|txt|ico)$/.test(pathname);
}

// Background sync for offline queue
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(
      fetch('/api/sync-offline-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(r => r.json())
        .catch(error => console.error('[ServiceWorker] Sync failed:', error))
    );
  }
});

// Push notifications for real-time updates
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: data.tag,
        data: data.data,
      })
    );
  } catch (error) {
    console.error('[ServiceWorker] Push notification failed:', error);
  }
});
