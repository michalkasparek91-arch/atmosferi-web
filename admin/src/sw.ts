/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: any;
};

// Workbox manifest injection mark
precacheAndRoute(self.__WB_MANIFEST);

const VERSION = '1.4.4';

self.addEventListener('push', (event) => {
  console.log('[SW] Native push received');
  let payload: any = {};
  if (event.data) {
    try {
      payload = event.data.json();
      console.log('[SW] Push payload parsed:', payload);
    } catch (e) {
      console.warn('[SW] Push payload is not JSON');
      payload = { notification: { title: 'Zrobee', body: event.data.text() } };
    }
  }

  const title = payload?.notification?.title || payload?.data?.title || payload?.title || 'Nové upozornění';
  const options = {
    body: payload?.notification?.body || payload?.data?.body || payload?.body || '',
    icon: payload?.notification?.image || payload?.data?.imageUrl || payload?.notification?.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-monochrome.svg',
    data: payload?.data || {}
  };

  const notificationPromise = self.registration.showNotification(title, options);
  event.waitUntil(notificationPromise);
});

self.addEventListener('install', (event) => {
  console.log(`[SW] Install v${VERSION}`);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`[SW] Activate v${VERSION} - Claiming clients...`);
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/remeslnik/hledej';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          return (client as WindowClient).focus().then(c => {
             if (c && 'navigate' in c) {
               c.navigate(urlToOpen);
             }
             return c;
          });
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
