/**
 * Service Worker - Offline-first caching strategy
 * Implements app shell pattern, background sync, and instant loading
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

  // Skip non-GET requests and external requests in some cases
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
  // Static assets - cache first
  else if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request, ASSET_CACHE));
  }
  // HTML pages - stale while revalidate
  else if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(staleWhileRevalidateStrategy(request, ASSET_CACHE));
  }
});

/**
 * Network first strategy (good for API calls)
 * Try network, fallback to cache if offline
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
    
    // Return offline response
    return offlineResponse();
  }
}

/**
 * Cache first strategy (good for static assets)
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
    
    return offlineResponse();
  }
}

/**
 * Stale while revalidate strategy (good for HTML)
 * Return cached immediately, fetch fresh in background
 */
async function staleWhileRevalidateStrategy(
  request: Request,
  cacheName: string
): Promise<Response> {
  const cached = await caches.match(request);
  
  // Fetch fresh in background
  fetch(request)
    .then(response => {
      if (response.ok) {
        const cache = caches.open(cacheName);
        cache.then(c => c.put(request, response.clone()));
      }
    })
    .catch(error => console.debug('[ServiceWorker] Background fetch failed:', error));
  
  // Return cached version immediately
  if (cached) {
    return cached;
  }
  
  // If not cached, wait for network
  try {
    return await fetch(request);
  } catch (error) {
    return offlineResponse();
  }
}

/**
 * Generate offline fallback response
 */
function offlineResponse(): Response {
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Offline</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
      color: #333;
    }
    .message {
      text-align: center;
      padding: 2rem;
    }
    h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
    p { margin: 0; color: #666; }
  </style>
</head>
<body>
  <div class="message">
    <h1>You are offline</h1>
    <p>Check your connection or try accessing cached content</p>
  </div>
</body>
</html>`,
    {
      status: 503,
      statusText: 'Service Unavailable',
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
 */
function isStaticAsset(request: Request): boolean {
  const url = new URL(request.url);
  return /\.(js|css|woff2?|ttf|eot|svg)$/.test(url.pathname);
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
});
