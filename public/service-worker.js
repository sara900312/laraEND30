self.addEventListener('push', e => {
  console.log('Push received:', e);
  
  let data = {};
  if (e.data) {
    try {
      data = e.data.json();
    } catch (error) {
      console.error('Error parsing push data:', error);
      data = { title: 'إشعار جديد', message: 'لديك إشعار جديد' };
    }
  }

  const title = data.title || 'إشعار جديد';
  const options = {
    body: data.message || 'لديك إشعار جديد',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: data.url || '/',
      orderId: data.order_id,
      type: data.type
    },
    tag: data.order_id ? `order-${data.order_id}` : 'general',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'عرض',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: 'إغلاق'
      }
    ]
  };

  e.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', e => {
  console.log('Notification clicked:', e);
  
  e.notification.close();

  if (e.action === 'dismiss') {
    return;
  }

  const urlToOpen = e.notification.data?.url || '/';
  
  e.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', e => {
  console.log('Notification closed:', e);
});

// Handle service worker activation
self.addEventListener('activate', event => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle service worker installation
self.addEventListener('install', event => {
  console.log('Service Worker installed');
  self.skipWaiting();
});
