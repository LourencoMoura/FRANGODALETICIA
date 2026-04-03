// Frango da Letícia - Service Worker
// Handles offline support, caching, and push notifications

const CACHE_NAME = "frango-da-leticia-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

// Install event - cache static assets
self.addEventListener("install", event => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn("[SW] Some assets failed to cache:", err);
      });
    })
  );

  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", event => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip API calls - let them go through network
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Network first strategy for HTML
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || caches.match("/index.html");
          });
        })
    );
    return;
  }

  // Cache first strategy for assets
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then(response => {
          if (
            !response ||
            response.status !== 200 ||
            response.type === "error"
          ) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Return a fallback response for failed requests
          return new Response("Offline - Asset not available", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({
              "Content-Type": "text/plain",
            }),
          });
        });
    })
  );
});

// Push notification event
self.addEventListener("push", event => {
  console.log("[SW] Push notification received");

  let notificationData = {
    title: "Frango da Letícia",
    body: "Você recebeu uma notificação",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    url: "/",
  };

  // Parse push data if available
  if (event.data) {
    try {
      notificationData = {
        ...notificationData,
        ...event.data.json(),
      };
    } catch (error) {
      console.error("[SW] Error parsing push data:", error);
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200],
    tag: "frango-notification",
    requireInteraction: false,
    data: {
      url: notificationData.url,
      timestamp: new Date().getTime(),
    },
    actions: [
      {
        action: "open",
        title: "Abrir",
      },
      {
        action: "close",
        title: "Fechar",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click event
self.addEventListener("notificationclick", event => {
  console.log("[SW] Notification clicked:", event.action);

  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const urlToOpen = event.notification.data.url || "/";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(clientList => {
        // Check if window is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }

        // Open new window if not found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close event
self.addEventListener("notificationclose", event => {
  console.log("[SW] Notification closed");
});

// Background sync for offline orders
self.addEventListener("sync", event => {
  console.log("[SW] Background sync triggered:", event.tag);

  if (event.tag === "sync-orders") {
    event.waitUntil(
      // Sync logic would go here
      Promise.resolve()
    );
  }
});

// Listen for messages from the client
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

console.log("[SW] Service Worker loaded successfully - V2");
