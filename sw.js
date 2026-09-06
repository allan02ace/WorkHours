// Work Hours Tracker — service worker
// Caches only the app shell (this page + icons) so the app opens offline.
// All Firebase/Firestore/Google traffic is left alone — the Firestore SDK
// handles its own offline queueing and syncs automatically once you're back online.

const CACHE_NAME = 'wht-shell-v6';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GET requests for the app shell.
  // Everything else (Firebase Auth, Firestore, Google APIs, analytics, etc.)
  // is left completely untouched so those services work normally.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached); // offline: fall back to cache
      // Cache-first for instant offline loads, but refresh cache in background.
      return cached || network;
    })
  );
});
