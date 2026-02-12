# 🚂 Deployment auf Railway

Railway ist die **einfachste und kostenlose** Möglichkeit, deine Aufgabenverwaltung online zu bringen!

## ⚡ Schnellstart (5 Minuten)

### 1. Account erstellen
- Gehe zu [railway.app](https://railway.app)
- Klicke auf "Start a New Project"
- Melde dich mit GitHub an

### 2. Projekt deployen

**Option A - Mit GitHub:**
1. Push deinen Code zu GitHub
2. In Railway: "Deploy from GitHub repo"
3. Wähle dein Repository
4. Railway erkennt automatisch Node.js

**Option B - Ohne GitHub (CLI):**
```bash
# Railway CLI installieren
npm install -g @railway/cli

# Login
railway login

# Projekt initialisieren
railway init

# Deployen
railway up
```

### 3. VAPID-Keys generieren

Lokal ausführen:
```bash
npm run generate-vapid
```

Du erhältst:
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa...
Private Key: UUxI4O8-FbRouAevSmBQ6o18hgE...
```

### 4. Umgebungsvariablen in Railway setzen

1. Gehe zu deinem Projekt in Railway
2. Klicke auf "Variables"
3. Füge hinzu:
   ```
   VAPID_PUBLIC_KEY=dein-generierter-public-key
   VAPID_PRIVATE_KEY=dein-generierter-private-key
   ```

### 5. Fertig! 🎉

Railway zeigt dir deine App-URL an, z.B.:
```
https://aufgaben-app-production.up.railway.app
```

## 🔧 Weitere Konfiguration

### Eigene Domain verbinden

1. In Railway: "Settings" → "Domains"
2. "Custom Domain" klicken
3. Domain eingeben (z.B. `aufgaben.deine-firma.de`)
4. DNS-Einträge bei deinem Domain-Provider setzen:
   ```
   Type: CNAME
   Name: aufgaben (oder @)
   Value: [Railway-URL]
   ```

### Datenbank-Backup einrichten

Railway speichert die SQLite-Datenbank im Container. Für Backups:

1. **Volume hinzufügen** (empfohlen):
   - In Railway: "Settings" → "Volumes"
   - Volume erstellen
   - Mount Path: `/app/data`
   - In `server.js` ändern: `./data/aufgaben.db`

2. **Oder PostgreSQL nutzen** (für größere Teams):
   ```bash
   # In Railway
   "New" → "Database" → "Add PostgreSQL"
   ```

### Logs ansehen

In Railway-Dashboard:
- Klicke auf "Deployments"
- Wähle neuestes Deployment
- Siehe "Build Logs" und "Deploy Logs"

### Automatische Deployments

Bei GitHub-Verbindung:
- Jeder Push zu `main` deployed automatisch
- In "Settings" → "Service" konfigurierbar

## 💰 Kosten

**Kostenlos-Tier:**
- 500 Stunden/Monat (ausreichend für kleine Teams)
- $5 Guthaben/Monat inklusive
- Danach ca. $0.000231/Stunde

**Für mehr Nutzung:**
- Hobby Plan: $5/Monat
- Unbegrenzte Stunden
- Persistente Volumes inklusive

## 🔒 Sicherheit

Railway bietet automatisch:
- ✅ HTTPS (SSL-Zertifikat)
- ✅ DDoS-Protection
- ✅ Automatische Updates
- ✅ Umgebungsvariablen verschlüsselt

## 🚨 Troubleshooting

### App startet nicht
1. Prüfe "Deploy Logs" in Railway
2. Stelle sicher dass `package.json` korrekt ist
3. Prüfe ob alle Umgebungsvariablen gesetzt sind

### Push-Benachrichtigungen funktionieren nicht
1. VAPID-Keys überprüfen
2. HTTPS muss aktiv sein (Railway macht das automatisch)
3. Browser-Berechtigungen prüfen

### Datenbank verschwindet nach Restart
- Volume hinzufügen (siehe oben)
- Oder PostgreSQL nutzen

## 📱 Nach dem Deployment

1. **App testen**: Öffne die URL im Browser
2. **Als PWA installieren**: In Chrome/Safari "Zum Startbildschirm hinzufügen"
3. **Push-Benachrichtigungen testen**: Als Mitarbeiter anmelden und aktivieren
4. **Team informieren**: URL teilen!

## 🔄 Updates deployen

**Mit GitHub:**
```bash
git add .
git commit -m "Update"
git push
# Railway deployed automatisch!
```

**Mit CLI:**
```bash
railway up
```

---

**Du bist jetzt live! 🚀**

Deine App läuft auf Railway mit:
- ✅ HTTPS aktiviert
- ✅ Push-Benachrichtigungen funktionsfähig
- ✅ Von überall erreichbar
- ✅ Automatische Deployments
