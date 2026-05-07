// Service Worker for PWA offline support
// HTML/CSS 使用「网络优先」，避免出现「旧 CSS + 新 HTML」导致同页刷新前后样式不一致

const CACHE_NAME = 'baby-food-helper-v7';

const urlsToCache = [
  './',
  './index.html',
  './meal-planner.html',
  './food-encyclopedia.html',
  './feeding-schedule.html',
  './growth-tracker.html',
  './allergy-tracker.html',
  './css/style.css',
  './js/app.js',
  './js/storage.js',
  './js/meal-planner.js',
  './js/encyclopedia.js',
  './js/schedule.js',
  './js/growth.js',
  './js/allergy-tracker.js',
  './data/food-relations.json',
  './data/food-nutrition.json'
];

function shouldNetworkFirst(request) {
  if (request.mode === 'navigate') return true;
  const dest = request.destination;
  if (dest === 'document' || dest === 'style') return true;
  try {
    const pathname = new URL(request.url).pathname;
    if (pathname.endsWith('.html')) return true;
    if (pathname.endsWith('.css')) return true;
  } catch (e) {
    /* ignore */
  }
  return false;
}

function cachePut(request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') return;
  const copy = response.clone();
  caches.open(CACHE_NAME).then(function (cache) {
    cache.put(request, copy);
  });
}

function networkFirst(request) {
  return fetch(request)
    .then(function (response) {
      cachePut(request, response);
      return response;
    })
    .catch(function () {
      return caches.match(request).then(function (cached) {
        if (cached) return cached;
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    });
}

function cacheFirst(request) {
  return caches.match(request).then(function (cached) {
    if (cached) return cached;
    return fetch(request).then(function (response) {
      cachePut(request, response);
      return response;
    });
  });
}

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    shouldNetworkFirst(event.request)
      ? networkFirst(event.request)
      : cacheFirst(event.request)
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    Promise.all([
      caches.keys().then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
          })
        );
      }),
      self.clients.claim()
    ])
  );
});
