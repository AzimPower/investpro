// Service Worker pour PWA InvestPro
const CACHE_NAME = 'investpro-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.tsx',
  '/src/index.css',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// URLs des API à mettre en cache
const API_CACHE_PATTERNS = [
  '/backend/lots.php',
  '/backend/settings.php',
  '/backend/transactions.php',
  '/backend/users.php',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache les ressources statiques
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(
      caches.match(request)
        .then((response) => response || fetch(request))
    );
    return;
  }

  // Cache intelligent pour les APIs
  if (API_CACHE_PATTERNS.some(pattern => url.pathname.includes(pattern))) {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.match(request)
            .then((cachedResponse) => {
              // Retourner la réponse en cache immédiatement
              if (cachedResponse) {
                // Rafraîchir en arrière-plan
                fetch(request)
                  .then((fetchResponse) => {
                    if (fetchResponse.ok) {
                      cache.put(request, fetchResponse.clone());
                    }
                  })
                  .catch(() => {}); // Ignorer les erreurs de rafraîchissement
                
                return cachedResponse;
              }
              
              // Pas de cache, récupérer et cacher
              return fetch(request)
                .then((fetchResponse) => {
                  if (fetchResponse.ok) {
                    cache.put(request, fetchResponse.clone());
                  }
                  return fetchResponse;
                });
            });
        })
    );
    return;
  }

  // Toutes les autres requêtes passent normalement
  event.respondWith(fetch(request));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
  );
});
