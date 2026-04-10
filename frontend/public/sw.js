// PXG Party Finder - Service Worker for Push Notifications

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Poke Party Finder', body: event.data.text() };
  }

  const options = {
    body: payload.body,
    icon: payload.icon ?? '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: payload.data ?? {},
    vibrate: [100, 50, 100],
    actions: payload.data?.roomId
      ? [{ action: 'open', title: 'Open Room' }]
      : [],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const roomId = event.notification.data?.roomId;
  const url = roomId ? `/room/${roomId}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
