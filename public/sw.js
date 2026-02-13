// Service Worker für Push-Benachrichtigungen und PWA-Funktionalität

const CACHE_NAME = 'aufgaben-app-v4';
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/manifest.json'
];

// Installation
self.addEventListener('install', event => {
    // Übernehme sofort die Kontrolle
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache geöffnet');
                return cache.addAll(urlsToCache);
            })
    );
});

// Aktivierung
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Alter Cache gelöscht:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Übernehme sofort Kontrolle über alle Clients
            return self.clients.claim();
        })
    );
});

// Fetch (Network-First für API-Calls)
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // API-Calls: Immer vom Netzwerk, NIE cachen
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ error: 'Offline' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }
    
    // Für statische Assets: Network-First (nicht Cache-First!)
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Wenn erfolgreich, cache es
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Nur wenn offline, nutze Cache
                return caches.match(event.request).then(response => {
                    return response || new Response('Offline');
                });
            })
    );
});

// Push-Benachrichtigungen empfangen
self.addEventListener('push', event => {
    console.log('Push-Nachricht empfangen:', event);

    let data = {
        title: 'Neue Aufgabe',
        body: 'Sie haben eine neue Aufgabe erhalten',
        icon: '/icon-192.png',
        badge: '/icon-72.png'
    };

    if (event.data) {
        try {
            const pushData = event.data.json();
            data = {
                title: pushData.title || data.title,
                body: pushData.body || data.body,
                icon: data.icon,
                badge: data.badge,
                data: {
                    taskId: pushData.taskId,
                    priority: pushData.priority
                }
            };
        } catch (e) {
            console.error('Fehler beim Parsen der Push-Daten:', e);
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        vibrate: [200, 100, 200],
        data: data.data,
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Aufgabe ansehen'
            },
            {
                action: 'close',
                title: 'Schließen'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Benachrichtigungs-Klick
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});
