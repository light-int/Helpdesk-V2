self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    const text = event.data ? event.data.text() : '';
    data = { title: text || 'Horizon Pro', message: '' };
  }

  const title = data.title || 'Horizon Pro';
  const options = {
    body: data.message || '',
    icon: 'https://ui-avatars.com/api/?name=RP&background=3ecf8e&color=ffffff&size=192',
    badge: 'https://ui-avatars.com/api/?name=RP&background=3ecf8e&color=ffffff&size=96',
    vibrate: [200, 100, 200],
    data: { url: data.link || '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const matchingClient = windowClients.find((c) => c.url.includes(urlToOpen));
      if (matchingClient) {
        return matchingClient.focus();
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, message, link } = event.data.payload;
    self.registration.showNotification(title || 'Horizon Pro', {
      body: message || '',
      icon: 'https://ui-avatars.com/api/?name=RP&background=3ecf8e&color=ffffff&size=192',
      badge: 'https://ui-avatars.com/api/?name=RP&background=3ecf8e&color=ffffff&size=96',
      vibrate: [200, 100, 200],
      data: { url: link || '/' }
    });
  }
});
