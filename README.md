# 📋 Aufgabenverwaltung - PWA mit Push-Benachrichtigungen

Eine einfache, aber leistungsstarke Aufgabenverwaltungs-App für Chef und Mitarbeiter mit Push-Benachrichtigungen.

## ✨ Features

- 👔 **Chef-Ansicht**: Aufgaben erstellen, zuweisen und überwachen
- 👷 **Mitarbeiter-Ansicht**: Eigene Aufgaben sehen und erledigen
- 🔔 **Push-Benachrichtigungen**: Sofortige Benachrichtigung bei neuen Aufgaben
- 📷 **Foto-Upload**: Beweisfotos für erledigte Aufgaben
- ⚡ **Progressive Web App (PWA)**: Installierbar auf jedem Gerät
- 📱 **Mobile-optimiert**: Perfekt für Smartphone-Nutzung
- 🔄 **Offline-Funktionalität**: Funktioniert auch ohne Internet
- ⏰ **Überfälligkeits-Tracking**: Automatische Markierung überfälliger Aufgaben
- 🗑️ **Auto-Cleanup**: Erledigte Aufgaben werden nach 7 Tagen gelöscht

## 🚀 Installation & Start

### Voraussetzungen
- Node.js (Version 16 oder höher)
- npm oder yarn

### 1. Abhängigkeiten installieren
```bash
npm install
```

### 2. VAPID-Keys generieren (für Push-Benachrichtigungen)
```bash
npm run generate-vapid
```

Kopiere die generierten Keys und setze sie als Umgebungsvariablen:
```bash
export VAPID_PUBLIC_KEY="dein-public-key"
export VAPID_PRIVATE_KEY="dein-private-key"
```

### 3. Server starten
```bash
# Produktion
npm start

# Entwicklung (mit Auto-Reload)
npm run dev
```

Die App ist dann verfügbar unter: **http://localhost:3000**

## 📦 Deployment-Optionen

### Option 1: Railway (Empfohlen - Kostenlos)

1. **Account erstellen** auf [railway.app](https://railway.app)
2. **Neues Projekt** erstellen
3. **GitHub Repository** verbinden
4. **Umgebungsvariablen** setzen:
   ```
   VAPID_PUBLIC_KEY=dein-public-key
   VAPID_PRIVATE_KEY=dein-private-key
   PORT=3000
   ```
5. **Deploy** - Railway deployed automatisch!

### Option 2: Render

1. **Account erstellen** auf [render.com](https://render.com)
2. **New Web Service** auswählen
3. **Repository** verbinden
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. **Umgebungsvariablen** hinzufügen
7. **Create Web Service**

### Option 3: Vercel

```bash
npm install -g vercel
vercel
```

Dann Umgebungsvariablen im Vercel Dashboard setzen.

### Option 4: Eigener Server (VPS)

```bash
# Server vorbereiten
sudo apt update
sudo apt install nodejs npm nginx

# App hochladen
git clone dein-repository
cd aufgaben-app
npm install

# PM2 installieren (Process Manager)
npm install -g pm2

# App mit PM2 starten
pm2 start server.js --name aufgaben-app
pm2 save
pm2 startup

# Nginx als Reverse Proxy konfigurieren
sudo nano /etc/nginx/sites-available/aufgaben-app
```

Nginx-Konfiguration:
```nginx
server {
    listen 80;
    server_name deine-domain.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/aufgaben-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL mit Let's Encrypt (optional aber empfohlen)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d deine-domain.de
```

## 🔧 Konfiguration

### Mitarbeiter hinzufügen

Standardmäßig sind 5 Mitarbeiter vordefiniert. Du kannst diese ändern in `server.js` (Zeile 56-57):

```javascript
const defaultEmployees = ['Dein Name 1', 'Dein Name 2', 'etc.'];
```

Oder neue Mitarbeiter über die API hinzufügen:
```bash
curl -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"name":"Neuer Mitarbeiter"}'
```

### Überfälligkeits-Zeitraum ändern

In `server.js` bei der Aufgabenerstellung (Standard: 48 Stunden):
```javascript
overdue_hours: 48  // Ändere diesen Wert
```

### Auto-Cleanup-Zeitraum ändern

In `server.js` (Standard: 7 Tage):
```javascript
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
// Ändere die 7 auf deine gewünschte Anzahl Tage
```

## 📱 Als App installieren

### Android:
1. Öffne die App im Chrome-Browser
2. Tippe auf das Menü (⋮)
3. Wähle "Zum Startbildschirm hinzufügen"

### iOS:
1. Öffne die App im Safari-Browser
2. Tippe auf das Teilen-Symbol
3. Wähle "Zum Home-Bildschirm"

### Desktop:
1. Öffne die App im Chrome oder Edge
2. Klicke auf das ⊕ Symbol in der Adressleiste
3. Wähle "Installieren"

## 🔔 Push-Benachrichtigungen einrichten

1. Als **Mitarbeiter** anmelden
2. Deinen Namen auswählen
3. Auf **"Benachrichtigungen aktivieren"** klicken
4. Berechtigung erteilen

Ab jetzt erhältst du eine Push-Benachrichtigung, wenn der Chef dir eine neue Aufgabe zuweist!

## 🗂️ Dateistruktur

```
aufgaben-app/
├── server.js              # Backend-Server
├── package.json           # Abhängigkeiten
├── aufgaben.db           # SQLite-Datenbank (wird automatisch erstellt)
└── public/
    ├── index.html        # Frontend
    ├── app.js            # JavaScript-Logik
    ├── sw.js             # Service Worker
    └── manifest.json     # PWA-Manifest
```

## 🔒 Sicherheitshinweise

**Wichtig für Produktiv-Umgebungen:**

1. **HTTPS verwenden**: Push-Benachrichtigungen funktionieren nur über HTTPS
2. **VAPID-Keys schützen**: Niemals in Git committen, nur als Umgebungsvariablen
3. **Authentifizierung hinzufügen**: Aktuell keine Login-Funktion (für einfache Teams OK)
4. **Firewall konfigurieren**: Nur Port 80/443 öffnen
5. **Backups einrichten**: Regelmäßige Datenbank-Backups

## 🐛 Troubleshooting

### Push-Benachrichtigungen funktionieren nicht
- Stelle sicher, dass HTTPS aktiv ist (außer localhost)
- Prüfe ob VAPID-Keys korrekt gesetzt sind
- Überprüfe Browser-Berechtigungen

### Datenbank-Fehler
- Lösche `aufgaben.db` und starte neu
- Prüfe Schreibrechte im Verzeichnis

### Port bereits belegt
```bash
# Port ändern
export PORT=8080
npm start
```

## 📞 Support

Bei Fragen oder Problemen:
1. Prüfe die Konsole (F12 in Browser)
2. Schaue in die Server-Logs
3. Erstelle ein Issue auf GitHub

## 📝 Lizenz

MIT License - Du darfst diese App frei verwenden und anpassen!

---

**Viel Erfolg mit deiner Aufgabenverwaltung! 🚜**
