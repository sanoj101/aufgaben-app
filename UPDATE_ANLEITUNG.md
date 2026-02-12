# 🔄 UPDATE-ANLEITUNG - Version 2.0

## 🎉 **Neue Funktionen:**

✅ **Login-System**
- Chef-Login mit Passwort "Bauer"
- Mitarbeiter-Login mit individuellem Passwort

✅ **Mitarbeiterverwaltung (nur für Chef)**
- Neue Mitarbeiter anlegen
- Mitarbeiter löschen
- Passwörter vergeben und ändern

✅ **Verbesserungen**
- Foto-Limit von 5 MB auf 10 MB erhöht
- Bug behoben: "Aufgabe erledigt" funktioniert jetzt korrekt
- Logout-Funktion

---

## 📋 **Wichtig: Standard-Passwörter**

Die 5 vorhandenen Mitarbeiter haben jetzt Standard-Passwörter:

| Mitarbeiter | Passwort |
|------------|----------|
| Max Müller | max123 |
| Anna Schmidt | anna123 |
| Thomas Weber | thomas123 |
| Lisa Meyer | lisa123 |
| Peter Koch | peter123 |

**⚠️ Der Chef sollte diese Passwörter SOFORT ändern!**

---

## 🚀 **Update durchführen:**

### **Schritt 1: Lokale Dateien aktualisieren**

1. **Ersetze diese Dateien** in deinem `aufgaben-app` Ordner:
   - `server.js` (Backend mit Login-System)
   - `public/index.html` (Frontend mit Login-Screen)
   - `public/app.js` (JavaScript mit neuen Funktionen)

2. **Behalte diese Dateien** (unverändert):
   - `package.json`
   - `public/sw.js`
   - `public/manifest.json`
   - `.gitignore`
   - `.env.example`

---

### **Schritt 2: Auf GitHub hochladen**

Öffne Terminal im `aufgaben-app` Ordner:

```bash
git add .
git commit -m "Update v2.0: Login-System + Mitarbeiterverwaltung"
git push
```

---

### **Schritt 3: Railway deployt automatisch**

1. Gehe zu **https://railway.app/dashboard**
2. Öffne dein Projekt
3. Klicke auf **"Deployments"**
4. Railway erkennt die Änderungen und deployt automatisch neu
5. Warte ca. 2-3 Minuten
6. Prüfe ob **"SUCCESS"** erscheint ✅

---

### **Schritt 4: Datenbank-Migration**

**WICHTIG:** Die Datenbank muss aktualisiert werden!

Railway erstellt automatisch die neue Spalte `password` in der Employees-Tabelle.

**Falls Probleme auftreten:**

1. In Railway: Gehe zu deinem Projekt
2. Klicke auf **"Settings"** → **"Data"** (falls vorhanden)
3. Oder: Lösche die alte Datenbank (Railway erstellt automatisch eine neue)

**Achtung:** Beim Löschen der Datenbank gehen ALLE Aufgaben verloren!

---

## 🧪 **Nach dem Update testen:**

### **Test 1: Chef-Login**
1. Öffne die App-URL
2. Du siehst jetzt einen **Login-Screen**
3. Klicke **"👔 Chef"**
4. Passwort eingeben: `Bauer`
5. Klicke **"Anmelden"**
6. ✅ Du solltest eingeloggt sein

---

### **Test 2: Mitarbeiterverwaltung**
1. Als Chef eingeloggt
2. Du siehst oben: **"👥 Mitarbeiterverwaltung"**
3. Auf der rechten Seite: Liste aller Mitarbeiter
4. Jeder Mitarbeiter hat zwei Buttons:
   - **"🔑 Passwort ändern"**
   - **"🗑️ Löschen"**

**Teste:**
- Klicke **"🔑 Passwort ändern"** bei "Max Müller"
- Gib ein neues Passwort ein (z.B. `neuespasswort`)
- Bestätige

---

### **Test 3: Neuen Mitarbeiter anlegen**
1. Als Chef eingeloggt
2. Links unter "➕ Neuer Mitarbeiter"
3. **Name:** Klaus Schmidt
4. **Passwort:** klaus456
5. Klicke **"Mitarbeiter anlegen"**
6. ✅ "Klaus Schmidt" erscheint rechts in der Liste

---

### **Test 4: Mitarbeiter-Login**
1. Klicke **"Abmelden"**
2. Login-Screen erscheint
3. Klicke **"👷 Mitarbeiter"**
4. Wähle **"Max Müller"**
5. Passwort: Das neue Passwort das du vergeben hast
6. Klicke **"Anmelden"**
7. ✅ Du bist als Max Müller eingeloggt
8. Du siehst nur DEINE Aufgaben

---

### **Test 5: Mitarbeiter löschen**
1. Als Chef einloggen
2. Bei "Klaus Schmidt" klicke **"🗑️ Löschen"**
3. Bestätige die Sicherheitsabfrage
4. ✅ Klaus Schmidt verschwindet aus der Liste

---

### **Test 6: Foto-Upload (10 MB)**
1. Als Mitarbeiter einloggen
2. Offene Aufgabe auswählen
3. Klicke **"📷 Foto hinzufügen"**
4. Wähle ein Foto (bis 10 MB)
5. ✅ Foto wird hochgeladen und angezeigt

---

### **Test 7: Aufgabe erledigen (Bug behoben)**
1. Als Mitarbeiter einloggen
2. Bei einer offenen Aufgabe klicke **"✓ Erledigt"**
3. ✅ Die Aufgabe wird sofort als "Erledigt" markiert
4. ✅ Status-Badge wird grün
5. ✅ Zeitstempel zeigt "Erledigt: vor X Sekunden"

---

### **Test 8: Logout**
1. Klicke oben auf **"Abmelden"**
2. ✅ Du wirst zum Login-Screen zurückgeleitet
3. ✅ Alle Formulare sind zurückgesetzt

---

## 🔒 **Sicherheitshinweise:**

### **WICHTIG: Passwörter ändern!**

Nach dem ersten Login als Chef:

1. **Chef-Passwort ändern:**
   - Aktuell fest im Code: "Bauer"
   - Für mehr Sicherheit später änderbar (kontaktiere mich)

2. **Mitarbeiter-Passwörter ändern:**
   - Standard-Passwörter sind NICHT sicher!
   - Gehe zu "Mitarbeiterverwaltung"
   - Ändere alle Passwörter auf sichere Passwörter

---

## 🛡️ **Passwort-Empfehlungen:**

**Sichere Passwörter:**
- ✅ Mindestens 8 Zeichen
- ✅ Buchstaben + Zahlen
- ✅ Beispiel: `Klaus2024!` oder `Traktor789`

**Unsichere Passwörter:**
- ❌ `123456`
- ❌ `passwort`
- ❌ Nur Zahlen oder nur Buchstaben

---

## 📱 **Mobile Nutzung:**

Das Login funktioniert auch auf dem Smartphone:

1. App-URL öffnen
2. Login-Screen erscheint automatisch
3. Als Mitarbeiter anmelden
4. Push-Benachrichtigungen aktivieren
5. Als App installieren

**Vorteil:** Login-Status bleibt gespeichert, man muss sich nicht bei jedem Öffnen neu anmelden.

---

## 🔄 **Änderungen an bestehenden Daten:**

**Aufgaben:** ✅ Bleiben erhalten
**Mitarbeiter:** ✅ Bleiben erhalten, bekommen nur Passwort-Feld
**Fotos:** ✅ Bleiben erhalten

**Achtung:** Falls die Datenbank-Migration nicht automatisch funktioniert, müssen Mitarbeiter neu angelegt werden.

---

## ❓ **Häufige Fragen nach dem Update:**

**F: Kann ich mich nicht mehr einloggen?**
A: Prüfe ob du das richtige Passwort verwendest. Chef: "Bauer"

**F: Mitarbeiter können sich nicht einloggen?**
A: Standard-Passwörter sind: name123 (z.B. max123, anna123)

**F: Die Mitarbeiterliste ist leer?**
A: Datenbank muss migriert werden. Railway macht das automatisch nach dem Deploy.

**F: Alte Aufgaben sind weg?**
A: Sollte nicht passieren. Prüfe ob Railway erfolgreich deployed hat.

**F: Foto-Upload funktioniert nicht?**
A: Prüfe ob das Foto kleiner als 10 MB ist.

---

## 🎯 **Zusammenfassung:**

### **Was hat sich geändert:**
1. ✅ Login-Pflicht für Chef und Mitarbeiter
2. ✅ Chef kann Mitarbeiter verwalten
3. ✅ Jeder Mitarbeiter hat eigenes Passwort
4. ✅ Foto-Limit auf 10 MB erhöht
5. ✅ Bug "Aufgabe erledigt" behoben
6. ✅ Logout-Funktion

### **Was bleibt gleich:**
- ✅ Aufgaben erstellen und zuweisen
- ✅ Push-Benachrichtigungen
- ✅ PWA-Installation
- ✅ Foto-Upload
- ✅ Automatische Löschung nach 7 Tagen

---

## 🚀 **Jetzt updaten:**

```bash
# 1. Dateien ersetzen
# 2. Git hochladen:
git add .
git commit -m "Update v2.0"
git push

# 3. Railway prüfen
# 4. Testen!
```

---

**Viel Erfolg mit dem Update!** 🎉

Bei Problemen melde dich! 😊
