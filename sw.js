// Service Worker for PWA offline support
const CACHE_NAME = 'baby-food-helper-v1';
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

// 安装时缓存资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

// 拦截请求，优先使用缓存
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request).then(response => {
        // 动态缓存新请求
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
