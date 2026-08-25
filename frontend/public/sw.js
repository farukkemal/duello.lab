const CACHE_NAME = 'duellolab-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon.svg',
  '/favicon.svg'
];

// Install Event - Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network First with Cache Fallback for assets, bypass for API & SignalR
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass API and SignalR Hub requests
  if (
    requestUrl.pathname.startsWith('/api') ||
    requestUrl.pathname.startsWith('/hubs') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache valid static responses
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.destination === 'style' ||
           event.request.destination === 'script' ||
           event.request.destination === 'image' ||
           event.request.destination === 'font')
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Return index.html for SPA route navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Çevrimdışı içerik yüklenemedi.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
          });
        });
      })
  );
});

// Push Event - Receive push notification from server
self.addEventListener('push', (event) => {
  let data = {
    title: '⚔️ Yeni Düello Meydan Okuması!',
    body: 'Bir rakip seninle canlı TYT düellosuna girmek istiyor!',
    url: '/dashboard?tab=duello',
    roomCode: null
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/pwa-icon.svg',
    badge: '/pwa-icon.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || (data.roomCode ? `/lobby/${data.roomCode}` : '/dashboard'),
      dateOfArrival: Date.now()
    },
    actions: [
      { action: 'accept', title: '⚔️ Düelloya Katıl' },
      { action: 'close', title: '✕ Reddet' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event - Navigate user directly to match or page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
