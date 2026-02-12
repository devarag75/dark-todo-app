/* ============================================
   TaskForge — Service Worker (Offline Cache)
   v2: Versioned cache, relative paths, font caching
   ============================================ */

const CACHE_VERSION = 'taskforge-v2';

// Core assets to pre-cache during install
const CORE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icons/icon-192.svg',
    './icons/icon-512.svg',
];

// Install — cache all core static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v2...');
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            return cache.addAll(CORE_ASSETS);
        })
    );
    // Activate immediately, don't wait for old tabs to close
    self.skipWaiting();
});

// Activate — clean up old caches from previous versions
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v2...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_VERSION)
                    .map((key) => {
                        console.log('[SW] Removing old cache:', key);
                        return caches.delete(key);
                    })
            );
        })
    );
    // Take control of all open tabs immediately
    self.clients.claim();
});

// Fetch — Cache-first for local assets, stale-while-revalidate for fonts
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Strategy: Stale-while-revalidate for Google Fonts (cross-origin)
    if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
        event.respondWith(
            caches.open(CACHE_VERSION).then((cache) => {
                return cache.match(event.request).then((cached) => {
                    const networkFetch = fetch(event.request).then((response) => {
                        cache.put(event.request, response.clone());
                        return response;
                    }).catch(() => cached);
                    return cached || networkFetch;
                });
            })
        );
        return;
    }

    // Strategy: Cache-first for same-origin assets
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                // Return cache immediately, but also update cache in background
                fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_VERSION).then((cache) => {
                            cache.put(event.request, response);
                        });
                    }
                }).catch(() => { }); // silently fail network update
                return cached;
            }

            // Not in cache — fetch from network
            return fetch(event.request).then((response) => {
                // Cache new same-origin requests dynamically
                if (response && response.status === 200 && url.origin === self.location.origin) {
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // Offline fallback for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
