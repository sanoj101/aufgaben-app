// Service Worker für Push-Benachrichtigungen und PWA-Funktionalität
// Optimiert für maximale Zuverlässigkeit

const CACHE_NAME = 'aufgaben-app-v5';
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/manifest.json'
];

// Installation - sofort übernehmen
self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    self.skipWaiting(); // Sofort aktivieren
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching files');
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.error('[SW] Cache error:', err))
    );
});

// Aktivierung - alte Caches löschen
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Claiming clients');
            return self.clients.claim(); // Sofort Kontrolle übernehmen
        })
    );
});

// Fetch - Network First für API
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // API-Calls: Immer vom Netzwerk, NIE cachen
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return new Response(JSON.stringify({ error: 'Offline' }), {
                        headers: { 'Content-Type': 'application/json' },
                        status: 503
                    });
                })
        );
        return;
    }
    
    // Für statische Assets: Network First
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then(response => {
                    return response || new Response('Offline', { status: 503 });
                });
            })
    );
});

// Push-Benachrichtigungen - OPTIMIERT!
self.addEventListener('push', event => {
    console.log('[SW] Push received!', event.data);
    
    let data;
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        console.error('[SW] Invalid push data:', e);
        data = {
            title: 'Neue Benachrichtigung',
            body: event.data ? event.data.text() : 'Neue Aufgabe'
        };
    }
    
    const title = data.title || '📋 Neue Aufgabe';
    const options = {
        body: data.body || 'Sie haben eine neue Aufgabe',
        icon: '/icon-192.png',
        badge: '/icon-96.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'aufgabe-' + (data.taskId || Date.now()),
        requireInteraction: true,
        renotify: true,
        silent: false,
        timestamp: Date.now(),
        data: {
            taskId: data.taskId,
            url: '/',
            timestamp: Date.now()
        }
        // Action-Buttons entfernt - Klick auf Benachrichtigung öffnet App
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
            .then(() => {
                console.log('[SW] ✓ Notification shown successfully');
                
                // Wake up all clients
                return self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
            })
            .then(clients => {
                // Benachrichtige alle Tabs dass neue Daten da sind
                clients.forEach(client => {
                    client.postMessage({
                        type: 'PUSH_RECEIVED',
                        data: data
                    });
                });
            })
            .catch(err => {
                console.error('[SW] ✗ Notification failed:', err);
                
                // Fallback: Versuche es mit minimaler Config
                return self.registration.showNotification(title, {
                    body: data.body || 'Neue Aufgabe',
                    icon: '/icon-192.png'
                });
            })
    );
});

// Notification Click - öffnet App direkt
self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification clicked');
    event.notification.close();
    
    // URL der App
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        self.clients.matchAll({ 
            type: 'window',
            includeUncontrolled: true 
        })
        .then(clientList => {
            console.log('[SW] Found clients:', clientList.length);
            
            // Prüfe ob App bereits offen ist
            for (let client of clientList) {
                const clientUrl = new URL(client.url);
                const targetUrl = new URL(urlToOpen, self.location.origin);
                
                // Wenn gleiche Origin, fokussiere das Fenster
                if (clientUrl.origin === targetUrl.origin) {
                    console.log('[SW] Focusing existing client');
                    return client.focus();
                }
            }
            
            // Sonst öffne neues Fenster
            if (self.clients.openWindow) {
                const absoluteUrl = new URL(urlToOpen, self.location.origin).href;
                console.log('[SW] Opening new window:', absoluteUrl);
                return self.clients.openWindow(absoluteUrl);
            }
        })
        .catch(err => {
            console.error('[SW] Error handling notification click:', err);
        })
    );
});

// Background Sync - für Offline-Aktionen
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'sync-tasks') {
        event.waitUntil(
            self.clients.matchAll({ includeUncontrolled: true })
                .then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ type: 'SYNC_TASKS' });
                    });
                })
        );
    }
});

// Message Handler
self.addEventListener('message', event => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLAIM_CLIENTS') {
        self.clients.claim();
    }
    
    if (event.data && event.data.type === 'CHECK_UPDATE') {
        event.waitUntil(
            self.registration.update()
                .then(() => {
                    console.log('[SW] Update check completed');
                })
        );
    }
});

console.log('[SW] Service Worker loaded');
