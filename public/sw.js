const CACHE = 'entreno-pwa-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', '/manifest.webmanifest'])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/')));
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

function defaultPushData() {
  return {
    title: 'Descanso terminado',
    body: 'Siguiente serie',
    tag: 'rest-timer',
    url: '/',
  };
}

self.addEventListener('push', (event) => {
  event.waitUntil(handlePush(event));
});

async function handlePush(event) {
  const data = defaultPushData();
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') Object.assign(data, parsed);
    }
  } catch {
    try {
      if (event.data) {
        const text = event.data.text();
        if (text) data.body = text;
      }
    } catch {}
  }

  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const visible = clientsList.some((c) => c.visibilityState === 'visible');

  // Si la app está en primer plano, ella misma pita y vibra; no duplicamos el aviso.
  if (visible && (data.tag === 'rest-timer' || data.tag === 'rest-timer-test')) {
    for (const client of clientsList) {
      try {
        client.postMessage({ type: 'rest-timer-push', payload: data });
      } catch {}
    }
    return;
  }

  await self.registration.showNotification(data.title || 'Descanso terminado', {
    body: data.body || 'Siguiente serie',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 80, 200, 80, 200],
    tag: data.tag || 'rest-timer',
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || '/' },
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      if ('focus' in client) {
        await client.focus();
        if (client.navigate && target) {
          try { await client.navigate(target); } catch {}
        }
        return;
      }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(target);
    }
  })());
});
