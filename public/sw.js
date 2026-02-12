// Service Worker für Push-Benachrichtigungen und PWA-Funktionalität

const CACHE_NAME = 'aufgaben-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/manifest.json'
];

// Installation
self.addEventListener('install', event => {
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
        })
    );
});

// Fetch (Offline-Unterstützung)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache-Treffer - gebe gespeicherte Antwort zurück
                if (response) {
                    return response;
                }
                
                // Keine Cache-Treffer - hole vom Netzwerk
                return fetch(event.request).then(
                    response => {
                        // Prüfe ob wir eine gültige Antwort erhalten haben
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone die Antwort
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
            .catch(() => {
                // Offline - zeige Fallback-Seite
                return caches.match('/index.html');
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
