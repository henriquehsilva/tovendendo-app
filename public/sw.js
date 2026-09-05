const CACHE = 'to-vendendo-v7';
const ASSETS = ['/', '/manifest.webmanifest', '/favicon.png', '/icon-192.png', '/icon-512.png', '/tovendendo-app-logo.png', '/default-store-logo.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(response => response || (event.request.mode === 'navigate' ? caches.match('/') : Response.error()))));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destination = event.notification.data?.url || '/lojas';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(openClients => {
    const existing = openClients.find(client => new URL(client.url).pathname === destination);
    return existing ? existing.focus() : clients.openWindow(destination);
  }));
});
